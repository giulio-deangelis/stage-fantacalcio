/* eslint-env es6 */
/* eslint 
    no-unused-vars: 1,
    no-warning-comments: 1, 
    no-shadow: 0,
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
    MessageHelper
) => {
    'use strict';

    var model, msg, gBoxes, id;
    const editorModel = new JSONModel();
    const groupId = 'batch';

    const filters = {
        p: new Filter('Ruolo', 'EQ', 'P'),
        d: new Filter('Ruolo', 'EQ', 'D'),
        c: new Filter('Ruolo', 'EQ', 'C'),
        a: new Filter('Ruolo', 'EQ', 'A')
    };

    return Controller.extend('training.fantacalcio.controller.FantaEditor', {

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute('FantaEditor')
                .attachPatternMatched(this.onPatternMatch, this);
        },

        onPatternMatch: function (ev) {
            id = ev.getParameter('arguments').id;
            model = this.getView().getModel('Fantacalcio');
            msg = new MessageHelper(this);
                        
            const wiz = this.byId('wizard');
            const step1 = wiz.getSteps()[0];
            wiz.discardProgress(step1);
            wiz.goToStep(step1);
            step1.setValidated(false);
            wiz.setModel(editorModel);
            
            this._loadEditor();
        },

        leave: function () {
            this.getOwnerComponent().getRouter().navTo('Fantasquadre');
            gBoxes.forEach(it => it.setValue(null));
            gBoxes.clear();
            editorModel.setData({});
        },

        validateStep1: function () {
            const wiz = this.byId('wizard');
            const step = this.byId('step1');
            const id = this.byId('idInput').getValue();
            const nome = this.byId('nomeInput').getValue();
            const presidente = this.byId('presidenteInput').getValue();
            
            if (String.isBlank(id, nome, presidente)) {
                wiz.invalidateStep(step);
                return false;
            }

            wiz.validateStep(step);
            return true;
        },

        validateStep2: function () {
            const data = editorModel.getData();
            const wiz = this.byId('wizard');
            const step = this.byId('step2');

            if (data.budget - this._getTotalBudget() < 0) {
                wiz.invalidateStep(step);
                return false;
            }

            wiz.validateStep(step);
            return true;
        },

        validateSteps: function () {
            return this.validateStep1() && this.validateStep2();
        },

        onSave: function () {
            if (!this.validateSteps()) return;

            BusyIndicator.show();

            const that = this;
            const data = editorModel.getData();
            const giocatori = data.giocatori.isEmpty()
                ? this._getSelectedGiocatori()
                : data.giocatori;

            this._saveFantasquadra({
                squadra: this._getFantaFromEditor(),
                giocatori,
                update: data.update,

                success: function () {
                    BusyIndicator.hide();
                    that.leave();
                },

                error: function () {
                    BusyIndicator.hide();
                }
            });
        },

        onGiocatoreSelected: function (ev) {
            const ruolo = this._getRuoloFromId(ev.getSource());
            this._applyBoxFiltersForRuolo(ruolo);
            this._updateBudget();
        },

        formatTotalBudget: function (total) {
            const budgetLabel = this.byId('totalBudget');
            const negative = editorModel.getData().budget - total < 0;
            budgetLabel.addStyleClass(negative ? 'negative' : 'positive');
            budgetLabel.removeStyleClass(negative ? 'positive' : 'negative');
            return total;
        },

        _loadEditor: function () {
            const that = this;
            this._prepareEditorData(() => {
                that._setupBoxes();
                if (id) that.validateStep1();
            });
        },

        _prepareEditorData: function (callback) {
            if (id) {
                this._fetchFanta((squadra, giocatori) => {
                    editorModel.setData({
                        budget: squadra.Budget,
                        total: 0,
                        id,
                        nome: squadra.Nome,
                        presidente: squadra.Presidente,
                        logo: squadra.Logo,
                        giocatori: giocatori,
                        update: true
                    });
                    editorModel.refresh();
                    callback();
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
                editorModel.refresh();
                callback();
            }
        },

        _fetchFanta: function (success) {
            const path = encodeURI(`/Fantasquadra('${id}')`);

            model.read(path, {groupId});
            model.read(path + '/Giocatori', {groupId});

            model.submitChanges({
                async: true,
                groupId,

                success: function (data) {
                    const squadra = data.__batchResponses[0].data;
                    const giocatori = data.__batchResponses[1].data.results;
                    if (success) success(squadra, giocatori);
                },

                error: function () {
                    msg.error('fantaFetchFailed');
                }
            });
        },

        _setupBoxes: function (onDone) {
            const giocatori = editorModel.getData().giocatori.slice();
            gBoxes = this.byId('gBoxes').getChildrenMatching(/.*combo-\S\d$/);

            for (const box of gBoxes) {
                const that = this;
                const ruolo = this._getRuoloFromId(box);

                box.setModel(model);

                const boxFilters = [
                    filters[ruolo],
                    new Filter('Fantasquadra', 'EQ', null)
                ];

                if (id) boxFilters.push(new Filter('Fantasquadra', 'EQ', id));

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
        }
    });
});