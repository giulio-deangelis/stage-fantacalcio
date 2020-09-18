/* eslint-env es6 */
/* eslint 
    no-unused-vars: 1,
    no-warning-comments: 1, 
    no-console: 0,
    quotes: 0, 
    curly: 0,
*/

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/Sorter',
    'sap/ui/core/ListItem',
    'sap/ui/core/BusyIndicator',
    '../model/Formatter',
    '../util/FragmentManager',
    '../util/MessageHelper',
    '../util/extensions/Array',
    '../util/extensions/String',
    '../util/extensions/Control'
], (
    Controller,
    JSONModel,
    Filter,
    Sorter,
    ListItem,
    BusyIndicator,
    Formatter,
    FragmentManager,
    MessageHelper
) => {
    'use strict';

    var model;
    var fragmentManager, msg;
    var gBoxes, currentFantaPath, currentFantaId;
    const editorFragment = 'training.fantacalcio.view.fragment.FantaEditor';
    const groupId = 'batch';

    const editorModel = new JSONModel({});

    const filters = {
        all: [],
        p: new Filter('Ruolo', 'EQ', 'P'),
        d: new Filter('Ruolo', 'EQ', 'D'),
        c: new Filter('Ruolo', 'EQ', 'C'),
        a: new Filter('Ruolo', 'EQ', 'A')
    };

    return Controller.extend('training.fantacalcio.controller.Fantasquadre', {

        formatter: Formatter,

        onBeforeRendering: function () {
            model = this.getView().getModel('Fantacalcio');
            fragmentManager = new FragmentManager(this);
            msg = new MessageHelper(this);

            model.setDeferredGroups([groupId]);
            model.setSizeLimit(1000);

            this.byId('fantaList').setModel(model);
            this.byId('detailForm').setModel(model);
        },

        navTo: function (id) {
            this.byId('splitter').toDetail(this.createId(id), 'fade');
            this.byId('homeButton').setVisible(id !== 'welcome');
        },

        onHome: function () {
            this.navTo('welcome');
        },

        onNew: function () {
            this._openEditor();
        },
        
        onNewV2: function () {
            this.getOwnerComponent().getRouter().navTo('FantaEditor');
        },

        onEdit: function () {
            const that = this;

            this._fetchCurrentFanta({

                success: function (squadra, giocatori) {
                    that._openEditor(squadra, giocatori);
                },

                error: () => msg.error('fantaReadFailed')
            });
        },
        
        onEditV2: function () {
            this.getOwnerComponent().getRouter().navTo('FantaEditor', {
                id: currentFantaId
            });
        },

        onDelete: function () {
            const that = this;

            const onConfirm = function () {
                BusyIndicator.show();
                that._fetchCurrentFanta({

                    success: function (squadra, giocatori) {
                        that._deleteFantaSquadra({
                            squadra,
                            giocatori,

                            success: function () {
                                BusyIndicator.hide();
                                that.navTo('welcome');
                            }
                        });
                    },

                    error: function () {
                        BusyIndicator.hide();
                    }
                });
            };

            msg.confirm('confirmDeleteText', 'confirmDeleteTitle', (ok) => {
                if (ok) onConfirm();
            });
        },

        onSquadre: function () {
            this.getOwnerComponent().getRouter().navTo('Squadre');
        },

        onFantaSelected: function (ev) {
            const ctx = ev.getParameter('listItem').getBindingContext();
            const path = ctx.getPath();

            this.byId('detailForm').bindElement(path);
            this.navTo('detail');

            currentFantaId = ctx.getObject().Id;
            currentFantaPath = path;
        },

        onFilter: function (ev) {
            const key = ev.getParameter('selectedKey');
            this.byId('giocatoriTable').getBinding('items').filter(filters[key]);
        },

        onGiocatoreSelected: function (ev) {
            const ruolo = this._getRuoloFromId(ev.getSource());
            this._applyBoxFiltersForRuolo(ruolo);
            this._updateBudget();
        },
        
        isFantaValid: function () {
            const data = editorModel.getData();
            if (String.isBlank(data.id, data.nome, data.presidente)) {
                msg.error('invalidFanta');
                return false;
            }
            if (data.budget - this._getTotalBudget() < 0) {
                msg.error('insufficientBudget');
                return false;
            }
            return true;
        },

        onFantaSave: function () {
            if (!this.isFantaValid()) return;
            
            BusyIndicator.show();
            
            const data = editorModel.getData();
            
            const giocatori = data.giocatori.isEmpty() && !data.update
                ? this._getSelectedGiocatori()
                : data.giocatori;

            fragmentManager.close(editorFragment);

            const that = this;
            
            this._saveFantasquadra({
                squadra: this._getFantaFromEditor(),
                giocatori,
                update: data.update,

                success: function () {
                    fragmentManager.destroy(editorFragment);
                    BusyIndicator.hide();
                    model.refresh();
                    that.resetEditor();
                },

                error: function () {
                    BusyIndicator.hide();
                    fragmentManager.open(editorFragment);
                }
            });
        },
        
        onFantaCancel: function () {
            fragmentManager.closeAndDestroy(editorFragment);
            this.resetEditor();
        },

        resetEditor: function () {
            gBoxes.clear();
            editorModel.setData({});
        },

        formatTotalBudget: function (total) {
            const budgetLabel = this.byId('totalBudget');
            const negative = editorModel.getData().budget - total < 0;
            budgetLabel.addStyleClass(negative ? 'negative' : 'positive');
            budgetLabel.removeStyleClass(negative ? 'positive' : 'negative');
            return total;
        },

        _openEditor: function (squadra, giocatori) {
            this._prepareEditorData(squadra, giocatori);

            const fragment = fragmentManager.open(editorFragment);
            fragment.setEscapeHandler(this.onFantaCancel.bind(this));
            fragment.setModel(editorModel);

            // get all the gBoxes by using an extension function
            gBoxes = this.byId('fantaBoxes').getChildrenMatching(/.*combo-\S\d$/);

            this._setupBoxes(this._updateBudget.bind(this));
        },

        _prepareEditorData: function (squadra, giocatori) {
            if (squadra) {
                editorModel.setData({
                    budget: squadra.Budget,
                    total: 0,
                    id: squadra.Id,
                    nome: squadra.Nome,
                    presidente: squadra.Presidente,
                    logo: squadra.Logo,
                    giocatori,
                    update: true
                });
            } else {
                editorModel.setData({
                    budget: 250,
                    total: 0,
                    id: '',
                    nome: '',
                    presidente: '',
                    logo: '',
                    giocatori: [],
                    update: false
                });
            }
        },

        _setupBoxes: function (onDone) {
            const giocatori = editorModel.getData().giocatori.slice();
            const squadraId = editorModel.getData().id;

            for (const box of gBoxes) {
                const that = this;
                const ruolo = this._getRuoloFromId(box);

                box.setModel(model);

                const boxFilters = [
                    filters[ruolo],
                    new Filter('Fantasquadra', 'EQ', null)
                ];

                if (squadraId)
                    boxFilters.push(new Filter('Fantasquadra', 'EQ', squadraId));

                box.bindItems({
                    path: '/Giocatore',
                    filters: boxFilters,
                    sorter: new Sorter('Nome'),
                    template: new ListItem({
                        key: '{Id}',
                        text: '{Nome}',
                        additionalText: '{Quot_attuale}'
                    })
                });

                // an event to bind the boxes after the binding has completed
                box.getBinding('items').attachEventOnce('dataReceived', () => {
                    const giocatore = giocatori.removeFirst(it => it.Ruolo.toLowerCase() === ruolo);
                    if (giocatore) {
                        const item = box.getItemByKey(giocatore.Id.toString());
                        box.setSelectedItem(item);
                    }

                    that._applyFiltersOnAllBoxes();
                    box.attachChange(that.onGiocatoreSelected.bind(that));
                    box.setShowSecondaryValues(true);
                    box.addStyleClass('combo');
                    if (onDone) onDone();
                });
            }
        },

        _applyBoxFiltersForRuolo: function (ruolo) {
            const ruoloBoxes = this._getBoxesForRuolo(ruolo);
            const giocatori = ruoloBoxes.mapNotNull(it => it.getValue());

            // apply filters to the boxes while keeping the currently
            // selected player for each box
            for (const box of ruoloBoxes) {
                const giocatoriFilters = giocatori
                    .filter(it => it !== box.getValue())
                    .map(it => new Filter('Nome', 'NE', it));

                const filter = new Filter({
                    and: true,
                    filters: [
                        filters[ruolo],
                        ...giocatoriFilters
                    ]
                });

                box.getBinding('items').filter(filter);
            }
        },

        _applyFiltersOnAllBoxes: function () {
            for (const ruolo of ['p', 'd', 'c', 'a'])
                this._applyBoxFiltersForRuolo(ruolo);
        },

        _getBoxesForRuolo: function (ruolo) {
            const list = [];
            for (const box of gBoxes) {
                if (this._getRuoloFromId(box) === ruolo)
                    list.push(box);
            }
            return list;
        },

        _getRuoloFromId: function (box) {
            const id = box.getId();
            return id.substring(id.length - 2, id.length - 1);
        },

        _updateBudget: function () {
            editorModel.getData().total = this._getTotalBudget();
            editorModel.refresh();
        },

        _getTotalBudget: function () {
            let total = 0;

            const oldGiocatori = editorModel.getData().giocatori;
            const selectedGiocatori = this._getSelectedGiocatori();

            const newGiocatori = selectedGiocatori.slice().removeAll(oldGiocatori, 'Id');

            const removedGiocatori = oldGiocatori.isNotEmpty()
                ? oldGiocatori.slice().removeAll(selectedGiocatori, 'Id')
                : [];

            // subtract removed players from the budget
            for (const giocatore of removedGiocatori)
                total -= giocatore.Quot_attuale;

            // add the new players to the budget
            for (const giocatore of newGiocatori)
                total += giocatore.Quot_attuale;

            return total;
        },

        _getSelectedGiocatori: function () {
            return gBoxes.mapNotNull(box => {
                const selected = box.getSelectedItem();
                if (selected) return selected.getBindingContext().getObject();
                else return null;
            });
        },

        _getFantaFromEditor: function () {
            const data = editorModel.getData();
            return {
                Id: data.id,
                Nome: data.nome,
                Presidente: data.presidente,
                Logo: data.logo,
                Budget: data.budget - data.total
            };
        },

        _fetchCurrentFanta: function (callbacks) {
            const path = encodeURI(currentFantaPath);
            
            model.read(path, {groupId});
            model.read(path + '/Giocatori', {groupId});

            model.submitChanges({
                async: true,
                groupId,

                success: function (data) {
                    const squadra = data.__batchResponses[0].data;
                    const giocatori = data.__batchResponses[1].data.results;
                    if (callbacks.success) callbacks.success(squadra, giocatori);
                },

                error: function () {
                    msg.error('fantaFetchFailed');
                    if (callbacks.error) callbacks.error();
                }
            });
        },

        _saveFantasquadra: function (params) {
            const squadra = params.squadra;
            const giocatori = params.giocatori;

            if (params.update) { // if we're updating an existing team
                model.update(encodeURI(`/Fantasquadra('${squadra.Id}')`), squadra, {groupId});

                const selectedGiocatori = this._getSelectedGiocatori();
                const removedGiocatori = giocatori.slice().removeAll(selectedGiocatori, 'Id');
                const newGiocatori = selectedGiocatori.slice().removeAll(giocatori, 'Id');
                
                for (const giocatore of removedGiocatori)
                    model.update(`/Giocatore(${giocatore.Id})`, {Fantasquadra: null}, {groupId});

                for (const giocatore of newGiocatori)
                    model.update(`/Giocatore(${giocatore.Id})`, {Fantasquadra: squadra.Id}, {groupId});

            } else { // if we're creating a new team
                model.create('/Fantasquadra', squadra, {groupId});
                for (const giocatore of giocatori)
                    model.update(`/Giocatore(${giocatore.Id})`, {Fantasquadra: squadra.Id}, {groupId});
            }

            model.submitChanges({
                async: true,
                groupId,

                success: function () {
                    msg.toast(params.update ? 'fantaUpdated' : 'fantaCreated');
                    if (params.success) params.success();
                },

                error: function () {
                    msg.error(params.update ? 'fantaUpdateFailed' : 'fantaCreateFailed');
                    if (params.error) params.error();
                }
            });
        },

        _deleteFantaSquadra: function (params) {
            const squadra = params.squadra;
            const giocatori = params.giocatori;

            for (const giocatore of giocatori) {
                model.update(
                    `/Giocatore(${giocatore.Id})`,
                    {Fantasquadra: null},
                    {groupId}
                );
            }

            model.remove(`/Fantasquadra('${squadra.Id}')`, {groupId});

            model.submitChanges({
                async: true,
                groupId,

                success: function () {
                    msg.toast('fantaDeleted');
                    if (params.success) params.success();
                },

                error: function () {
                    msg.error('fantaDeleteFailed');
                    if (params.error) params.error();
                }
            });
        }
    });
});