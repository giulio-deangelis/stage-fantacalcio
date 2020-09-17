/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/core/BusyIndicator',
    '../model/Formatter',
    '../util/FragmentManager',
    '../util/MessageHelper',
    '../util/CsvReader',
    '../util/extensions/Array',
    '../util/extensions/String'
], (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    BusyIndicator,
    Formatter,
    FragmentManager,
    MessageHelper,
    CsvReader
) => {
    'use strict';

    const logoEditorFragment = "training.fantacalcio.view.fragment.LogoEditor";

    var model, msg, fragmentManager;
    var table, list, squadraTitle, logoImg, squadraHeader, tabBar, uploader;
    var editableQtAttChildren;
    var currentSquadraPath;
    var tableItemsCount = 0;
    const groupId = 'batch';


    const filters = {
        all: [],
        p: new Filter('Ruolo', FilterOperator.EQ, 'P'),
        d: new Filter('Ruolo', FilterOperator.EQ, 'D'),
        c: new Filter('Ruolo', FilterOperator.EQ, 'C'),
        a: new Filter('Ruolo', FilterOperator.EQ, 'A')
    };

    return Controller.extend('training.fantacalcio.controller.Main', {

        formatter: Formatter,

        onBeforeRendering: function () {
            model = this.getView().getModel('Fantacalcio');
            msg = new MessageHelper(this);
            fragmentManager = new FragmentManager(this);

            table = this.byId('giocatoriTable');
            list = this.byId('squadreList');
            squadraTitle = this.byId('squadraTitle');
            logoImg = this.byId('logoImg');
            squadraHeader = this.byId('squadraHeader');
            tabBar = this.byId('tabBar');

            model.setDeferredGroups([groupId]);
            list.setModel(model);
            table.setModel(model);
            squadraHeader.setModel(model);
            tabBar.setModel(model);
            uploader = this.byId('uploader');
        },

        navTo: function (id) {
            this.byId('splitter').toDetail(this.createId(id), 'fade');
            this.byId('homeButton').setVisible(id !== 'welcome');
        },

        onHome: function () {
            this.navTo('welcome');
        },

        onFantasquadre: function () {
            this.getOwnerComponent().getRouter().navTo("Fantasquadre");
        },

        onFileBrowse: function () {
            uploader.FUEl.click();
        },

        onUpload: function () {
            if (!uploader.getValue()) return;
            BusyIndicator.show();
            const file = uploader.getFocusDomRef().files[0];

            // ensure that the same file will work in the future
            // (change event won't trigger if the file path is the same)
            uploader.setValue(null);

            // reset the database and upload the new data
            this._resetDatabase(() => {
                this.navTo('welcome');
                CsvReader.read({file, success: this._importTables});
            });
        },

        onTableUpdate: function (ev) {
            const actual = ev.getParameter('actual');
            const total = ev.getParameter('total');
            const rows = table.getItems().slice(tableItemsCount, actual);

            tableItemsCount = actual;

            this._refreshQtDiff(rows);
        },

        onSquadraSelected: function (ev) {
            const ctx = ev.getParameter('listItem').getBindingContext();

            // Nota: basta bindare il padre di tutti questi elementi,
            // come ho fatto nella seconda pagina
            currentSquadraPath = ctx.getPath();
            table.bindElement(currentSquadraPath);
            squadraHeader.bindElement(currentSquadraPath);
            tabBar.bindElement(currentSquadraPath);

            this.navTo('detail');
            this.byId('detail').scrollTo(0, 0);
        },

        onFilter: function (ev) {
            tableItemsCount = 0;
            if (editableQtAttChildren) {
                this._toggleEditableQtAtt(editableQtAttChildren);
                editableQtAttChildren = null;
            }

            const key = ev.getParameter('selectedKey');
            table.getBinding('items').filter(filters[key]);
        },

        onEditQtAtt: function (ev) {
            // ensure that only one cell at a time is editable
            if (editableQtAttChildren)
                this._toggleEditableQtAtt(editableQtAttChildren);

            // toggle editable mode on the current cell
            const children = this._getQtAttChildren(ev.getSource().getParent());
            this._toggleEditableQtAtt(children);

            // remember this cell to disable editing later
            editableQtAttChildren = children;

            children.input.focus();
        },

        onSaveQtAtt: function (ev) {
            editableQtAttChildren = null; // no cells are editable now

            // toggle editable mode on the current cell
            const children = this._getQtAttChildren(ev.getSource().getParent());
            this._toggleEditableQtAtt(children);

            // update the database
            const giocatorePath = children.input.getBindingContext().getPath();
            const qtAtt = children.input.getValue();
            this._updateQtAtt(giocatorePath, qtAtt);

            // update the difference
            const row = ev.getSource().getParent().getParent();
            this._refreshQtDiff([row]);
        },

        onEditLogo: function () {
            const dialog = fragmentManager.open(logoEditorFragment);
            dialog.setModel(new JSONModel());
        },

        onSaveLogo: function () {
            const newLogo = fragmentManager
                .get(logoEditorFragment)
                .getModel()
                .getData()
                .Logo;

            this._updateLogo(currentSquadraPath, newLogo);
            fragmentManager.closeAndDestroy(logoEditorFragment);
        },

        onLogoEditCancel: function () {
            fragmentManager.closeAndDestroy(logoEditorFragment);
        },

        onReset: function () {
            msg.confirm('confirmReset', 'confirm', (ok) => {
                if (ok) this._resetDatabase(() => this.navTo('welcome'));
            });
        },

        /** Recalculates the quotation difference values in the table for the given rows */
        // Nota per il prossimo progetto: esiste il composite binding che permette di fare
        // queste operazioni molto più facilmente
        _refreshQtDiff: function (rows) {
            for (const row of rows) {
                const cells = row.getCells();
                const qtIniz = cells[2].getText();
                const qtAtt = cells[3].findElements()[0].getValue();
                const diff = qtAtt - qtIniz;

                const diffCell = cells[4];
                diffCell.setText(diff);
                diffCell.removeStyleClass(diff < 0 ? 'positive' : 'negative');
                diffCell.addStyleClass(diff < 0 ? 'negative' : 'positive');
            }
        },

        _toggleEditableQtAtt: function (children) {
            const editable = children.input.getEditable();
            children.input.setEditable(!editable);
            children.editButton.setVisible(editable);
            children.saveButton.setVisible(!editable);
        },

        _getQtAttChildren: function (parent) {
            const children = parent.findElements();
            return {
                input: children[0],
                editButton: children[1],
                saveButton: children[2]
            };
        },

        _importTables: function (csvObj) {
            const baseUrl = model.sServiceUrl.substringBeforeLast('/');
            const xsjsUrl = baseUrl + '/import.xsjs';
            
            const squadre = csvObj.getColumn('Squadra').distinct();
            
            const giocatori = csvObj.mapRows(row => {
                return {
                    Id: row.get('Id'),
                    Ruolo: row.get('R'),
                    Nome: row.get('Nome'),
                    Squadra: row.get('Squadra'),
                    Quot_iniziale: row.get('Qt. I'),
                    Quot_attuale: row.get('Qt. A')
                };
            });
            
            const data = JSON.stringify({squadre, giocatori});
            
            $.post({
                url: xsjsUrl,
                data,
                success: function (res) {
                    model.refresh();
                    BusyIndicator.hide();
                    msg.toast('uploadSucceeded');
                },
                error: function (err) {
                    console.log(err);
                    BusyIndicator.hide();
                }
            });
        },

        _updateQtAtt: function (path, qtAtt) {
            model.update(path, {Quot_attuale: qtAtt}, {
                async: true,
                error: () => msg.error('qtAttUpdateFailed')
            });
        },

        _updateLogo: function (path, logo) {
            model.update(path, {Logo: logo || null}, {
                async: true,
                error: () => msg.error('logoUpdateFailed')
            });
        },

        _resetDatabase: function (success) {
            const that = this;
            const baseUrl = model.sServiceUrl.substringBeforeLast('/');
            const xsjsUrl = baseUrl + '/reset.xsjs';

            $.ajax(xsjsUrl, {

                success: function () {
                    model.refresh();
                    if (success) success();
                },

                error: function (err) {
                    console.log(err);
                    msg.error('resetFailed');
                }
            });
        }
    });
});