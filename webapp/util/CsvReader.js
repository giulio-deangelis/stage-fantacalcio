/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define(['./CsvObject'], function (CsvObject) {
	'use strict';

	return {

		/**
		 * @callback success
		 * @param {Object} csvObj - The processed CsvObject.
		 * 
		 * The object will contain as many properties as there are columns,
		 * and each property will contain the corresponding cells.
		 */

		/**
		 * Read a CSV file into a JS object.
		 * @param {File} file - The file to read.
		 * @param {string} separator - The cell separator, defaults to a semicolon.
		 * @param {success} success - The function to call after the file has been read.
		 */
		read: function (params) {
			const reader = new FileReader();

			reader.onload = (ev) => {
				const data = ev.target.result;
				const colCount = this._getColumnCount(data);
				const csv = this._parse(data, params.separator || ';');
				const columns = csv.slice(0, colCount);
				const csvObj = {};
				let index = 0;
				
				for (const column of columns)
					csvObj[column] = [];
				
				csv.splice(0, colCount);
				
				while (index < csv.length) {
					for (const column of columns)
						csvObj[column].push(csv[index++]);
				}

				params.success(new CsvObject(csvObj));
			};

			reader.readAsText(params.file);
		},

		_getColumnCount: function (csvStr) {
			let colCount = 0;
			for (const c of csvStr) {
				if (c === '\n') {
					++colCount;
					break;
				}
				if (c === ';') ++colCount;
			}
			return colCount;
		},

		_parse: function (text, sep) {
			const values = [];
			const buf = [];
			// TODO consider escaped semicolons
			for (const c of text) {
				switch (c) {
				case '\r':
				    break;
				case '\n':
				case sep:
					values.push(buf.join(''));
					buf.length = 0;
					break;
				default:
					buf.push(c);
					break;
				}
			}
			return values;
		}
	};
});