/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define([], function () {
	'use strict';

	$.extend(String, {
		isBlank: function (...strings) {
			for (const string of strings)
				if (!string || string.isBlank()) return true;
			return false;
		}
	});

	$.extend(String.prototype, {

		isBlank: function () {
			for (const c of this)
				if (c !== ' ') return false;
			return true;
		},

		isNotBlank: function () {
			return !this.isBlank();
		},

		capitalize: function () {
			return this.substring(0, 1).toUpperCase() + this.substring(1);
		},

		decapitalize: function () {
			return this.substring(0, 1).toLowerCase() + this.substring(1);
		},

		substringBefore: function (delimiter, startPos) {
			const start = this.indexOf(delimiter, startPos || 0);
			if (start < 0) return this;
			return this.substring(0, start);
		},

		substringAfter: function (delimiter, startPos) {
			const start = this.indexOf(delimiter, startPos || 0) + delimiter.length;
			if (start < 0) return this;
			return this.substring(start + 1);
		},

		substringBeforeLast: function (delimiter, startPos) {
			const end = this.lastIndexOf(delimiter, startPos || this.length);
			if (end < 0) return this;
			return this.substring(0, end);
		},

		substringAfterLast: function (delimiter, startPos) {
			const start = this.lastIndexOf(delimiter, startPos || this.length) + delimiter.length;
			if (start < 0) return this;
			return this.substring(start + 1, this.length);
		},

		first: function (count) {
			return this.substring(0, count || 1);
		},

		last: function (count) {
			return this.substring(this.length - (count || 1), this.length);
		},

		matches: function (regex) {
			return regex.test(this);
		}
	});
});