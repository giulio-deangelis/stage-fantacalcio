/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly:, no-use-before-define: */
/* eslint-env es6 */

/** Utility class to show messages through this.i18n properties */
sap.ui.define([
	'sap/m/MessageToast',
	'sap/m/MessageBox'
], function (MessageToast, MessageBox) {
	'use strict';

	return function (controller) {
		const i18nModel = controller.getView().getModel('i18n');

		this.toast = function (msgProp) {
			MessageToast.show(this.i18n(msgProp));
		};

		this.alert = function (msgProp, titleProp) {
			MessageBox.alert(this.i18n(msgProp), this._defaultBoxSettings(titleProp));
		};

		this.confirm = function (msgProp, titleProp, onClose) {
			const settings = this._defaultBoxSettings(titleProp || 'confirm');
			const confirm = this.i18n('confirm');
			const cancel = this.i18n('cancel');

			settings.actions = [confirm, cancel];
			settings.emphasizedAction = confirm;

			settings.onClose = (action) => {
				onClose(action === confirm);
			};

			MessageBox.confirm(this.i18n(msgProp), settings);
		};

		this.error = function (msgProp, titleProp) {
			MessageBox.error(this.i18n(msgProp), this._defaultBoxSettings(titleProp || 'error'));
		};

		this.i18n = function (prop) {
			const msg = i18nModel.getProperty(prop);
			return msg ? msg : prop;
		};

		this._defaultBoxSettings = function (titleProp) {
			const settings = {};
			settings.title = this.i18n(titleProp);
			return settings;
		};
	};
});