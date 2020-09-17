/* eslint no-console:, no-warning-comments:, no-unused-vars:, quotes:, curly: */
/* eslint-env es6 */

sap.ui.define([], () => {
    'use strict';
    
    const imageUrlRegex = /\.(jpeg|jpg|gif|png)$/;
    const defaultLogo = "./assets/defaultLogo.png";
    
    return {
        
		getLogoOrDefault: function (url) {
		    if (imageUrlRegex.test(url)) return url;
		    else return defaultLogo;
		}
    };
});