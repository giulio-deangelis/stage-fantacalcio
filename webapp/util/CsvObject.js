/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define([], function () {
	'use strict';

	return function (data) {

		this.forEachRow = function (action) {
			const keys = Object.keys(data);
			const rowCount = data[keys[0]].length;
			for (let i = 0; i < rowCount; ++i) {
				const row = new Map();
				for (const key of keys)
				    row.set(key, data[key][i]);
				action(row);
			}
		};
		
		this.mapRows = function (transform) {
		    const list = [];
		    this.forEachRow(row => list.push(transform(row)));
		    return list;
		};
		
		this.getColumn = function (name) {
		    return data[name];
		};
		
		this.getRawData = function () {
		    return data;
		};
	};
});