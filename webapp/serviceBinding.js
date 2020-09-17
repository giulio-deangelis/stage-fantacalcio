function initModel() {
	var sUrl = "/fantacalcio/fantacalcio/fantacalcio.xsodata/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}