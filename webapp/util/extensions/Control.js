/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define([
	'sap/ui/core/Control',
	'./Array'
], (Control) => {
	'use strict';

	$.extend(Control.prototype, {

        /** Iterate over all children of this Control whose id match the given regex */
		forEachChildMatching: function (regex, action) {
			const stack = this.findElements();

			while (stack.isNotEmpty()) {
				const child = stack.pop();
				const id = child.getId();

				if (child.findElements)
					stack.push(...child.findElements());

				if (regex.test(id))
					action(child);
			}
		},
		
		/** Get all children of this Control whose id match the given regex */
		getChildrenMatching: function (regex) {
		    const list = [];
		    this.forEachChildMatching(regex, it => list.push(it));
		    return list;
		}
	});
});