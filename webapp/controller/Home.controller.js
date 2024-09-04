sap.ui.define([
	"com/infocus/dataListApplication/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageBox",
	"sap/viz/ui5/api/env/Format",
	"sap/ui/core/ValueState",
	"com/infocus/dataListApplication/libs/html2pdf.bundle"

], function(BaseController, Filter, FilterOperator, JSONModel, MessageBox, Format, ValueState, html2pdf_bundle) {
	"use strict";

	return BaseController.extend("com.infocus.dataListApplication.controller.Home", {

		/*************** Application on load  *****************/
		onInit: function() {

			this.oRouter = this.getOwnerComponent().getRouter();
			//// 04.09.2024 Authorization Changes ////
			this._getUserIdFromLoggedInUser();

			// call the input parameters data
			this.getLedgerParametersData();
			this.getcompanyCodeParametersData();
			this.getYearParametersData();
			this.getPeriodParametersData();

			// Update the global data model
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/reportS", "PRS");
				oGlobalDataModel.setProperty("/listS", "X");
				oGlobalDataModel.setProperty("/togglePanelVisibility", "X");
				oGlobalDataModel.setProperty("/pdfTableName", "Detailed List");
			}

			/*this._validateInputFields();*/
			this._columnVisible();

		},
		_getUserIdFromLoggedInUser: function() {
			var that = this;

			// the application is running within the Fiori Launchpad
			/*if (sap.ushell && sap.ushell.Container) {
				sap.ushell.Container.getServiceAsync("UserInfo").then(function(UserInfo) {
						var userId = UserInfo.getId();
						console.log(UserInfo);
						//var userId = "1000";
						that._onGlobalUserIdSet(userId);
					})
					.catch(function(oError) {
						MessageBox.error("Error retrieving ShellUIService: " + oError.message);
						console.error("Error retrieving ShellUIService: ", oError);
					});
			} else {*/
			// Fallback method using AJAX to call /sap/bc/ui2/start_up
			jQuery.ajax({
				url: "/sap/bc/ui2/start_up",
				method: "GET",
				success: function(data) {
					var userId = data.id;
					console.log("User ID from /sap/bc/ui2/start_up:", userId);
					that._onGlobalUserIdSet(userId);
				},
				error: function(xhr, status, error) {
					MessageBox.error("Error retrieving User ID via AJAX: " + status);
					console.error("Error retrieving User ID via AJAX:", status, error);
				}
			});

			/*}*/
		},

		_onGlobalUserIdSet: function(sUserId) {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/userId", sUserId || "");

				// Call userAuthSet after the userId is set
				this.userAuthSet();
			} else {
				console.error("Global data model is not available.");
			}
		},

		userAuthSet: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("authSetModel");
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oUrl = "/AUTHSet(UNAME='" + oGlobalData.userId + "')";

			sap.ui.core.BusyIndicator.show();

			oModel.read(oUrl, {
				urlParameters: {
					"sap-client": "400"
				},

				success: function(response) {
					var oData = response;
					console.log(oData);

					var oAuthDataModel = that.getOwnerComponent().getModel("authData");
					oAuthDataModel.setData(oData);

					// check in oData value is available or not 
					if (typeof oData !== 'undefined' && oData.length === 0) {

						// hide the busy indicator
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageBox.information('There are no data available!');
						/*that._columnVisible();*/
					} else {
						/*that._assignVisiblity(oData, that);*/

						///// Authorization Changes /////////
						var inputCompanyCode = that.byId("inputCompanyCode").getValue();
						that.totalRadioBtnCheck(inputCompanyCode);
						that.authorizationCheck();

						// hide the busy indicator
						sap.ui.core.BusyIndicator.hide();
					}

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);
				}
			});
		},
		authorizationCheck: function() {
			var oAuthDataModel = this.getOwnerComponent().getModel("authData");
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oAuthData = oAuthDataModel.oData;
			var totalRadioBtn = oGlobalDataModel.getProperty("/totalRadioBtnChk");

			////// Authorization Change ////////
			if (oAuthData.PRS === "X") {
				oGlobalDataModel.setProperty("/reportS", "PRS");
				this.byId("PRS").setSelected(true);
			} else if (oAuthData.FTRS === "X") {
				oGlobalDataModel.setProperty("/reportS", "FTRS");
				this.byId("FTRS").setSelected(true);
			} else if (oAuthData.CORP === "X") {
				oGlobalDataModel.setProperty("/reportS", "CORP");
				this.byId("CORP").setSelected(true);
			} else if (totalRadioBtn === "X") {
				oGlobalDataModel.setProperty("/reportS", "TOTAL");
				this.byId("companytotal").setSelected(true);
			} else {
				oGlobalDataModel.setProperty("/reportS", "");
			}

			// var inputCompanyCode = this.byId("inputCompanyCode").getValue();
			// this.totalRadioBtnCheck(inputCompanyCode);

		},
		totalRadioBtnCheck: function(sValue) {
			var oAuthDataModel = this.getOwnerComponent().getModel("authData");
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oAuthData = oAuthDataModel.oData;
			var compCode = [];
			var compArr = [];
			compArr = Object.entries(oAuthData); //// Convert Object Data into Array ////
			for (var i = 0; i < compArr.length; i++) {
				if (compArr[i][0].includes("TOTAL_") && compArr[i][1] === "X") {
					var oCode = compArr[i][0].slice(6);
					if (sValue === oCode) {
						this.byId("companytotal").setVisible(true);
						oGlobalDataModel.setProperty("/totalRadioBtnChk", "X");
						break;
					}
				} else if (compArr[i][0].includes("TOTAL_") && compArr[i][1] === "") {
					var oCode = compArr[i][0].slice(6);
					if (sValue === oCode) {
						this.byId("companytotal").setVisible(false);
						oGlobalDataModel.setProperty("/totalRadioBtnChk", "");
						break;
					}
				}
			}
		},
		_validateInputFields: function() {
			var inputLedger = this.byId("inputLedger");
			var inputCompanyCode = this.byId("inputCompanyCode");
			var inputFiscalYear = this.byId("inputFiscalYear");
			var inputFromPeriod = this.byId("inputFromPeriod");
			var inputToPeriod = this.byId("inputToPeriod");

			var isValid = true;
			var message = '';

			if (!inputLedger.getValue()) {
				inputLedger.setValueState(sap.ui.core.ValueState.Error);
				isValid = false;
				message += 'Ledger, ';
			} else {
				inputLedger.setValueState(sap.ui.core.ValueState.None);
			}

			if (!inputCompanyCode.getValue()) {
				inputCompanyCode.setValueState(sap.ui.core.ValueState.Error);
				isValid = false;
				message += 'Company Code, ';
			} else {
				inputCompanyCode.setValueState(sap.ui.core.ValueState.None);
			}

			if (!inputFiscalYear.getValue()) {
				inputFiscalYear.setValueState(sap.ui.core.ValueState.Error);
				isValid = false;
				message += 'Fiscal Year, ';
			} else {
				inputFiscalYear.setValueState(sap.ui.core.ValueState.None);
			}

			if (!inputFromPeriod.getValue()) {
				inputFromPeriod.setValueState(sap.ui.core.ValueState.Error);
				isValid = false;
				message += 'From Period, ';
			} else {
				inputFromPeriod.setValueState(sap.ui.core.ValueState.None);
			}

			if (!inputToPeriod.getValue()) {
				inputToPeriod.setValueState(sap.ui.core.ValueState.Error);
				isValid = false;
				message += 'To Period, ';
			} else {
				inputToPeriod.setValueState(sap.ui.core.ValueState.None);
			}

			if (!isValid) {
				// Remove the last comma and space from the message
				message = message.slice(0, -2);
				sap.m.MessageBox.show("Please fill up the following fields: " + message);
				return false;
			}

			// Set global data properties
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/ledgrNo", inputLedger.getValue());
				oGlobalDataModel.setProperty("/cmpnyCode", inputCompanyCode.getValue());
				oGlobalDataModel.setProperty("/fiscalY", inputFiscalYear.getValue());
				oGlobalDataModel.setProperty("/fromP", inputFromPeriod.getValue());
				oGlobalDataModel.setProperty("/toP", inputToPeriod.getValue());
			}

			return true;
		},
		onLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var sInputId = oInput.getId();
			var sInputValue = oInput.getValue();
			var sProperty;

			// update based on the input field ID
			if (sInputId.endsWith("--inputLedger")) {
				sProperty = "/ledgrNo";
			} else if (sInputId.endsWith("--inputCompanyCode")) {
				sProperty = "/cmpnyCode";
			} else if (sInputId.endsWith("--inputFiscalYear")) {
				sProperty = "/fiscalY";
			} else if (sInputId.endsWith("--inputFromPeriod")) {
				sProperty = "/fromP";
			} else if (sInputId.endsWith("--inputToPeriod")) {
				sProperty = "/toP";
			}

			// Update the global data model property
			if (sProperty) {
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty(sProperty, sInputValue);
				}
			}
			/// 04.09.2024 Total Radio Btn Check based on Company Code 
			this.totalRadioBtnCheck(sInputValue);

			// Apply ValueState based on input value
			if (sInputValue.trim() === "") {
				oInput.setValueState(ValueState.Error);
				oInput.setValueStateText("This field cannot be empty");
			} else {
				oInput.setValueState(ValueState.None);
				oInput.setValueStateText("");
			}
		},
		_columnVisible: function() {
			var oColumnVisible = this.getOwnerComponent().getModel("columnVisible");

			var data = {};
			data.glAcct = true;
			data.glAcctLongText = true;
			data.graphColumnVisible = false;
			for (var i = 1; i <= 16; i++) {
				var key = "l" + (i < 10 ? '0' + i : i) + "VFlag";
				data[key] = false;
			}

			oColumnVisible.setData(data);
		},

		/*************** get parameters data *****************/

		getLedgerParametersData: function() {
			var that = this;
			var parameterModel = this.getOwnerComponent().getModel("parameterModel");
			var pUrl = "/ZLEDGERSet";

			sap.ui.core.BusyIndicator.show();
			parameterModel.read(pUrl, {
				urlParameters: {
					"sap-client": "400"
				},
				success: function(response) {
					var pData = response.results;
					console.log(pData);
					sap.ui.core.BusyIndicator.hide();
					// set the ledger data 
					var oledgerDataModel = that.getOwnerComponent().getModel("ledgerData");
					oledgerDataModel.setData(pData);

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);

				}
			});

		},
		getcompanyCodeParametersData: function() {
			var that = this;
			var parameterModel = this.getOwnerComponent().getModel("parameterModel");
			var pUrl = "/ZCOMPANYSet";

			sap.ui.core.BusyIndicator.show();
			parameterModel.read(pUrl, {
				urlParameters: {
					"sap-client": "400"
				},
				success: function(response) {
					var pData = response.results.reverse();
					console.log(pData);
					sap.ui.core.BusyIndicator.hide();
					// set the ledger data 
					var ocompanyCodeDataModel = that.getOwnerComponent().getModel("companyCodeData");
					ocompanyCodeDataModel.setData(pData);
					
					// set the default input value in company code
					var inputCompanyCode = that.byId("inputCompanyCode");
					inputCompanyCode.setValue(pData[0].Companycode);

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);
				}
			});

		},
		getYearParametersData: function() {
			var that = this;
			var parameterModel = this.getOwnerComponent().getModel("parameterModel");
			var pUrl = "/ZYEARSet";

			sap.ui.core.BusyIndicator.show();
			parameterModel.read(pUrl, {
				urlParameters: {
					"sap-client": "400"
				},
				success: function(response) {
					var pData = response.results;
					console.log(pData);
					sap.ui.core.BusyIndicator.hide();
					// set the ledger data 
					var oYearDataModel = that.getOwnerComponent().getModel("yearData");
					oYearDataModel.setData(pData);

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);
				}
			});

		},
		getPeriodParametersData: function() {
			var that = this;
			var parameterModel = this.getOwnerComponent().getModel("parameterModel");
			var pUrl = "/ZPERIODSet";

			sap.ui.core.BusyIndicator.show();
			parameterModel.read(pUrl, {
				urlParameters: {
					"sap-client": "400"
				},
				success: function(response) {
					var pData = response.results;
					console.log(pData);
					sap.ui.core.BusyIndicator.hide();
					// set the ledger data 
					var oPeriodDataModel = that.getOwnerComponent().getModel("periodData");
					oPeriodDataModel.setData(pData);

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);
				}
			});

		},

		/*************** set the inputId & create the fragment *****************/

		/*handleValueLedger: function(oEvent) {
			this._ledgerInputId = oEvent.getSource().getId();
			// open fragment
			if (!this.oOpenDialogLedger) {
				this.oOpenDialogLedger = sap.ui.xmlfragment("com.infocus.dataListApplication.view.dialogComponent.DialogLedger", this);
				this.getView().addDependent(this.oOpenDialogLedger);
			}
			this.oOpenDialogLedger.open();
		},*/
		handleValueCompanyCode: function(oEvent) {
			this._companyCodeInputId = oEvent.getSource().getId();
			// open fragment
			if (!this.oOpenDialogComapanyCode) {
				this.oOpenDialogComapanyCode = sap.ui.xmlfragment("com.infocus.dataListApplication.view.dialogComponent.DialogComapanyCode", this);
				this.getView().addDependent(this.oOpenDialogComapanyCode);
			}
			this.oOpenDialogComapanyCode.open();
		},
		handleValueDialogFiscalYear: function(oEvent) {
			this._fiscalYearInputId = oEvent.getSource().getId();
			// open fragment
			if (!this.oOpenDialogFiscalYear) {
				this.oOpenDialogFiscalYear = sap.ui.xmlfragment("com.infocus.dataListApplication.view.dialogComponent.DialogFiscalYear", this);
				this.getView().addDependent(this.oOpenDialogFiscalYear);
			}
			this.oOpenDialogFiscalYear.open();
		},
		handleValueDialogFromPeriod: function(oEvent) {
			this._fromYearInputId = oEvent.getSource().getId();
			// open fragment
			if (!this.oOpenDialogFromPeriod) {
				this.oOpenDialogFromPeriod = sap.ui.xmlfragment("com.infocus.dataListApplication.view.dialogComponent.DialogFromPeriod", this);
				this.getView().addDependent(this.oOpenDialogFromPeriod);
			}
			this.oOpenDialogFromPeriod.open();
		},
		handleValueDialogToPeriod: function(oEvent) {
			this._toYearInputId = oEvent.getSource().getId();
			// open fragment
			if (!this.oOpenDialogToPeriod) {
				this.oOpenDialogToPeriod = sap.ui.xmlfragment("com.infocus.dataListApplication.view.dialogComponent.DialogToPeriod", this);
				this.getView().addDependent(this.oOpenDialogToPeriod);
			}
			this.oOpenDialogToPeriod.open();
		},

		/*************** search value within fragment *****************/

		_handleValueLedgerSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"Rldnr",
				FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueCompanyCodeSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"Companycode",
				FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueFiscalYearSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"Gjahr",
				FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueFromPeriodSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"Monat",
				FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueToPeriodSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"Monat",
				FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},

		/*************** set the each property to globalData & reflect data in input field  *****************/

		_handleValueLedgerClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var ledgerInput = this.byId(this._ledgerInputId);
				var newValue = oSelectedItem.getTitle();
				ledgerInput.setValue(newValue);

				//chk the blank input box validation
				var inputLedger = this.byId("inputLedger");
				if (newValue && newValue.trim()) {
					inputLedger.setValueState(sap.ui.core.ValueState.None);
				} else {
					inputLedger.setValueState(sap.ui.core.ValueState.Error);
				}

				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/ledgrNo", newValue);
				}
			}
			oEvent.getSource().getBinding("items").filter([]);
		},
		_handleValueCompanyCodeClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var ledgerInput = this.byId(this._companyCodeInputId);
				var newValue = oSelectedItem.getTitle();
				ledgerInput.setValue(newValue);
				
				this.totalRadioBtnCheck(newValue); //// Total Radio Btn Check
				this.authorizationCheck();

				//chk the blank input box validation
				var inputCompanyCode = this.byId("inputCompanyCode");
				if (newValue && newValue.trim()) {
					inputCompanyCode.setValueState(sap.ui.core.ValueState.None);
				} else {
					inputCompanyCode.setValueState(sap.ui.core.ValueState.Error);
				}

				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/cmpnyCode", newValue);
				}
			}
			oEvent.getSource().getBinding("items").filter([]);
		},
		_handleValueDialogFiscalYearClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var ledgerInput = this.byId(this._fiscalYearInputId);
				var newValue = oSelectedItem.getTitle();
				ledgerInput.setValue(newValue);

				//chk the blank input box validation
				var inputFiscalYear = this.byId("inputFiscalYear");
				if (newValue && newValue.trim()) {
					inputFiscalYear.setValueState(sap.ui.core.ValueState.None);
				} else {
					inputFiscalYear.setValueState(sap.ui.core.ValueState.Error);
				}

				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/fiscalY", newValue);
				}
			}
			oEvent.getSource().getBinding("items").filter([]);
		},
		_handleValueDialogFromPeriodClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var ledgerInput = this.byId(this._fromYearInputId);
				var newValue = oSelectedItem.getTitle();
				ledgerInput.setValue(newValue);

				//chk the blank input box validation
				var inputFromPeriod = this.byId("inputFromPeriod");
				if (newValue && newValue.trim()) {
					inputFromPeriod.setValueState(sap.ui.core.ValueState.None);
				} else {
					inputFromPeriod.setValueState(sap.ui.core.ValueState.Error);
				}

				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/fromP", newValue);
				}
			}
			oEvent.getSource().getBinding("items").filter([]);
		},
		_handleValueDialogToPeriodClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var ledgerInput = this.byId(this._toYearInputId);
				var newValue = oSelectedItem.getTitle();
				ledgerInput.setValue(newValue);

				//chk the blank input box validation
				var inputToPeriod = this.byId("inputToPeriod");
				if (newValue && newValue.trim()) {
					inputToPeriod.setValueState(sap.ui.core.ValueState.None);
				} else {
					inputToPeriod.setValueState(sap.ui.core.ValueState.Error);
				}

				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/toP", newValue);
				}
			}
			oEvent.getSource().getBinding("items").filter([]);
		},

		/*************** radio Button & drop down selection  *****************/

		onRadioButtonSelectReports: function(oEvent) {
			var radioButtonSelectReport = oEvent.getSource();
			var selectedButtonReport = radioButtonSelectReport.getSelectedButton().getText();

			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/reportS", selectedButtonReport);
			}
		},
		onRadioButtonSelectList: function(oEvent) {
			var radioButtonList = oEvent.getSource();
			var selectedButtonListText = radioButtonList.getSelectedButton().getText();

			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/listS", selectedButtonListText === "Detailed List" ? 'X' : '');
				oGlobalDataModel.setProperty("/pdfTableName", selectedButtonListText);
			}

		},
		onSelectChartType: function(oEvent) {
			// Get the selected radio button
			var selectedIndex = oEvent.getParameter("selectedIndex");
			var oVizFrame = this.byId("oVizFrame");
			var chartType;

			switch (selectedIndex) {
				case 0:
					chartType = "column";
					break;
				case 1:
					chartType = "pie";
					break;
				case 2:
					chartType = "line";
					break;
				case 3:
					chartType = "donut";
					break;
				default:
					chartType = "column";
			}

			// Update the vizType of the VizFrame
			oVizFrame.setVizType(chartType);
		},
		onTabularToChartChanged: function(oEvent) {
			var oSwitch = oEvent.getSource();
			var sId = oSwitch.getId();
			var aSwitches = [
				/*this.byId("splitViewSwitch"),*/
				this.byId("tabularDataSwitch"),
				this.byId("chartDataSwitch")
			]; // Array of all switches

			// SplitterLayoutData elements
			var oSplitterLayoutData1 = this.byId("splitterLayoutData1");
			var oSplitterLayoutData2 = this.byId("splitterLayoutData2");

			// which switch was toggled and get the corresponding text
			var sText;
			/*if (sId === this.byId("splitViewSwitch").getId()) {
				sText = "Split View";
			} else */
			if (sId === this.byId("tabularDataSwitch").getId()) {
				sText = "Tabular Data";
			} else if (sId === this.byId("chartDataSwitch").getId()) {
				sText = "Chart Data";
			} else {
				sText = "";
			}

			// If a valid switch was toggled
			if (sText) {
				// Turn off other switches and update SplitterLayoutData sizes
				aSwitches.forEach(function(s) {
					if (s.getId() !== sId) {
						s.setState(false);
					}
				});

				// Perform actions based on the text value of the toggled switch
				switch (sText) {
					case "Split View":
						oSplitterLayoutData1.setSize("50%");
						oSplitterLayoutData2.setSize("50%");
						break;
					case "Tabular Data":
						oSplitterLayoutData1.setSize("100%");
						oSplitterLayoutData2.setSize("0%");

						// pdf btn
						this.byId("downloadPdfBtn").setEnabled(true);
						break;
					case "Chart Data":
						oSplitterLayoutData1.setSize("0%");
						oSplitterLayoutData2.setSize("100%");

						// pdf btn
						this.byId("downloadPdfBtn").setEnabled(false);
						break;
					default:
						break;
				}
			}
		},

		/*************** Table column visible on based on flag  *****************/

		_assignVisiblity: function(oData, then) {
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oColumnVisibleData = then.getOwnerComponent().getModel("columnVisible").getData();

			oColumnVisibleData.glAcct = oData[0].Racct === "" ? false : true;
			oColumnVisibleData.glAcctLongText = oData[0].GlText === "" ? false : true;
			oColumnVisibleData.graphColumnVisible = oData[0].DET_FLAG === "X" ? false : true;
			oGlobalData.togglePanelVisibility = oData[0].DET_FLAG === "X" ? "X" : "";

			// SplitterLayoutData elements
			var oSplitterLayoutData1 = this.byId("splitterLayoutData1");
			var oSplitterLayoutData2 = this.byId("splitterLayoutData2");

			for (var i = 1; i <= 16; i++) {
				var flagKey = "L" + (i < 10 ? '0' + i : i) + "_FLAG";
				var columnKey = "l" + (i < 10 ? '0' + i : i) + "VFlag";
				oColumnVisibleData[columnKey] = oData[0][flagKey] === 'X' ? true : false;
			}

			if (oData[0].DET_FLAG === "") {
				this.loadDefaultGraph();
				this.byId("panelForm").setExpanded(false);
				this.byId("chartDataSwitch").setState(true);

				// Update SplitterLayoutData sizes for split view
				oSplitterLayoutData1.setSize("0%");
				oSplitterLayoutData2.setSize("100%");

				// pdf button
				this.byId("downloadPdfBtn").setEnabled(false);

			} else {

				this.byId("panelForm").setExpanded(false);
				this.byId("chartDataSwitch").setState(false);
				// pdf button
				this.byId("downloadPdfBtn").setEnabled(true);
				this._removeHighlight();
			}

			then.getOwnerComponent().getModel("columnVisible").setData(oColumnVisibleData);
			then.getOwnerComponent().getModel("globalData").setData(oGlobalData);
		},

		/*************** get the table data from oData service  *****************/

		getListData: function() {
			// Validate input fields
			if (!this._validateInputFields()) {
				// Validation failed, return without fetching data
				return;
			}

			var that = this;
			var oModel = this.getOwnerComponent().getModel();
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			//var oUrl = /ZFI_FCR_SRV/ZFI_FCRSet?$filter=Rldnr eq '0L' and Rbukrs eq '1100' and Ryear eq '2023' and PrctrGr eq 'FTRS' and MinPr eq '03' and MaxPr eq '10' and DET_FLAG eq 'X';
			var oUrl = "/ZFI_FCRSet";
			var ledgrNo = new Filter('Rldnr', FilterOperator.EQ, oGlobalData.ledgrNo);
			var cmpnyCode = new Filter('Rbukrs', FilterOperator.EQ, oGlobalData.cmpnyCode);
			var fiscalY = new Filter('Ryear', FilterOperator.EQ, oGlobalData.fiscalY);
			var reportS = new Filter('PrctrGr', FilterOperator.EQ, oGlobalData.reportS);
			var fromP = new Filter('MinPr', FilterOperator.EQ, oGlobalData.fromP);
			var toP = new Filter('MaxPr', FilterOperator.EQ, oGlobalData.toP);
			var listS = new Filter('DET_FLAG', FilterOperator.EQ, oGlobalData.listS);

			sap.ui.core.BusyIndicator.show();

			oModel.read(oUrl, {
				urlParameters: {
					"sap-client": "400"
				},
				filters: [ledgrNo, cmpnyCode, fiscalY, reportS, fromP, toP, listS],
				success: function(response) {
					var oData = response.results;
					console.log(oData);

					// Format decimal properties to 2 digits after the decimal point
					oData.forEach(function(item) {
						that._formatDecimalProperties(item, that);
					});

					var oListDataModel = that.getOwnerComponent().getModel("listData");
					oListDataModel.setData(oData);

					// check in oData value is available or not 
					if (typeof oData !== 'undefined' && oData.length === 0) {

						// hide the busy indicator
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageBox.information('There are no data available!');
						that._columnVisible();
					} else {
						that._assignVisiblity(oData, that);

						// hide the busy indicator
						sap.ui.core.BusyIndicator.hide();
					}

				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.log(error);
					var errorObject = JSON.parse(error.responseText);
					sap.m.MessageBox.error(errorObject.error.message.value);
				}
			});

		},
		_formatDecimalProperties: function(obj, then) {
			for (var key in obj) {

				if (key === 'Racct') {
					continue;
				} else if (typeof obj[key] === "object") {
					continue;
				} else if (!isNaN(parseFloat(obj[key])) && isFinite(obj[key])) {
					obj[key] = parseFloat(obj[key]).toFixed(2);
				}
			}

		},
		clearListData: function() {
			var that = this;

			sap.m.MessageBox.confirm(
				"Are you sure you want to clear all data?", {
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							// Clear input fields
							var oCompanyCodeDataModel = that.getOwnerComponent().getModel("companyCodeData");
							var oCompCode=oCompanyCodeDataModel.oData[0].Companycode;                   
							that.byId("inputCompanyCode").setValue(oCompCode); //// Authorization Change ////
							that.totalRadioBtnCheck(oCompCode);
							/////  Authorization Changes //////
							that.authorizationCheck();
							that.byId("inputLedger").setValue("0L");
							// that.byId("inputCompanyCode").setValue("1100");
							that.byId("inputFiscalYear").setValue("");
							that.byId("inputFromPeriod").setValue("01");
							that.byId("inputToPeriod").setValue("12");

							// Deselect radio buttons
							// that.byId("PRS").setSelected(true);
							// that.byId("FTRS").setSelected(false);
							// that.byId("CORP").setSelected(false);
							// that.byId("companytotal").setSelected(false);
							that.byId("detailedlist").setSelected(true);
							that.byId("summarylist").setSelected(false);

							// Clear list data
							var oListDataModel = that.getOwnerComponent().getModel("listData");
							oListDataModel.setData({});

							// clear the chart data 
							var oChartDataModel = that.getOwnerComponent().getModel("chartData");
							oChartDataModel.setData({});

							// Update global data model properties
							var oGlobalDataModel = that.getOwnerComponent().getModel("globalData");
							if (oGlobalDataModel) {
								oGlobalDataModel.setProperty("/listS", "X");
								oGlobalDataModel.setProperty("/togglePanelVisibility", "X");
							}

							that._columnVisible();
							that.byId("downloadPdfBtn").setEnabled(false);
						}
					}
				}
			);
		},

		/*************** chart function & plotting the chart data  *****************/

		loadDefaultGraph: function() {
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oListData = this.getOwnerComponent().getModel("listData").getData();
			var defaultFilterChartData = oListData[0]; // Assuming default data is at index 0
			var extractChartData = this.extractData(defaultFilterChartData);

			// Set default chart data
			this.getOwnerComponent().getModel("chartData").setData(extractChartData);

			// Set default panel visibility
			oGlobalData.togglePanelVisibility = defaultFilterChartData.DET_FLAG === "X" ? "X" : "";
			this.getOwnerComponent().getModel("globalData").setData(oGlobalData);

			// highlight the default table 
			/*var oTable = this.byId("dynamicTable");
			var aItems = oTable.getItems();*/
			this._highlightRow(0);
		},
		onChartButtonPress: function(oEvent) {
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oListData = this.getOwnerComponent().getModel("listData").getData();
			var oChartDataModel = this.getOwnerComponent().getModel("chartData");

			var oButton = oEvent.getSource();
			var oRow = oButton.getParent();
			var oTable = this.byId("dynamicTable");
			var iIndex = oTable.indexOfItem(oRow);
			// Highlight the clicked row
			this._highlightRow(iIndex);

			var filterChartData = oListData[iIndex];
			var extractChartData = this.extractData(filterChartData);
			oChartDataModel.setData(extractChartData);

			// set the globaldata
			oGlobalData.togglePanelVisibility = oListData[0].DET_FLAG === "X" ? "X" : "";
			this.getOwnerComponent().getModel("globalData").setData(oGlobalData);

			// SplitterLayoutData elements
			var oSplitterLayoutData1 = this.byId("splitterLayoutData1");
			var oSplitterLayoutData2 = this.byId("splitterLayoutData2");

			// set the split view switch state to true
			/*this.byId("splitViewSwitch").setState(true);*/
			this.byId("tabularDataSwitch").setState(false);
			this.byId("chartDataSwitch").setState(true);

			// Update SplitterLayoutData sizes for split view
			oSplitterLayoutData1.setSize("0%");
			oSplitterLayoutData2.setSize("100%");

		},
		extractData: function(obj) {
			var result = [];
			var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			var monthColors = {
				'Jan': '#5B9BD5', // Blue
				'Feb': '#FF7F0E', // Orange
				'Mar': '#4CAF50', // Green
				'Apr': '#F44336', // Red
				'May': '#9C27B0', // Purple
				'Jun': '#FFEB3B', // Yellow
				'Jul': '#00BCD4', // Cyan
				'Aug': '#607D8B', // Grey
				'Sep': '#FF5722', // Deep Orange
				'Oct': '#673AB7', // Deep Purple
				'Nov': '#8BC34A', // Light Green
				'Dec': '#FF9800' // Amber
			};

			var oVizFrame = this.byId("oVizFrame");
			oVizFrame.setVizProperties({
				title: {
					visible: true,
					text: obj.GlAcGroup
				},
				/*legend: {
					title: {
						visible: true,
						text: 'Months'
					}
				},*/
				plotArea: {
					dataPointStyle: {
						rules: months.map(function(month) {
							return {
								dataContext: {
									Month: month
								},
								properties: {
									color: monthColors[month]
								}
							};
						})
					}
				}
			});

			for (var i = 1; i <= 16; i++) {
				var flagKey = "L" + (i < 10 ? '0' + i : i) + "_FLAG";
				var flag = obj[flagKey];
				var monthIndex = i - 1 < 9 ? i + 3 : i - 9;
				var month = months[monthIndex - 1] || 'Total';
				var valueKey = i < 10 ? "L0" + i : "L" + i;
				var value = obj[valueKey];

				if (flag === "X") {
					result.push({

						Month: month,
						Value: value
					});
				}
			}

			return result;
		},
		_highlightRow: function(iIndex) {
			var oTable = this.byId("dynamicTable");
			oTable.getItems().forEach(function(item, index) {
				if (index === iIndex) {
					item.addStyleClass("highlightedRow");
				} else {
					item.removeStyleClass("highlightedRow");
				}
			});
		},
		_removeHighlight: function() {
			var oTable = this.byId("dynamicTable");
			oTable.getItems().forEach(function(item) {
				item.removeStyleClass("highlightedRow");
			});
		},

		/*************** download pdf function  *****************/

		onDownloadPDF: function() {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var pdfTableName = oGlobalDataModel.oData.pdfTableName;
			var oTable = this.byId("dynamicTable");
			var oTableHtml = oTable.getDomRef().outerHTML;

			// Create a temporary DOM element to manipulate the table HTML
			var tempDiv = document.createElement('div');
			tempDiv.innerHTML = oTableHtml;

			// Remove the "Chart" column from the table header and body
			var chartColumnIndex = -1;
			var table = tempDiv.querySelector('table');
			var headers = table.querySelectorAll('th, td');

			headers.forEach((header, index) => {
				if (header.innerText === "Chart") {
					chartColumnIndex = index;
				}
			});

			if (chartColumnIndex !== -1) {
				// Remove the header cell
				table.querySelector('thead tr').deleteCell(chartColumnIndex);

				// Remove the corresponding cells in the body rows
				var rows = table.querySelectorAll('tbody tr');
				rows.forEach(row => {
					row.deleteCell(chartColumnIndex);
				});
			}

			var updatedTableHtml = tempDiv.innerHTML;

			// Show the global BusyIndicator
			sap.ui.core.BusyIndicator.show(0);

			var opt = {
				margin: [0.5, 0.5, 0.5, 0.5], // Adjust margins as needed
				filename: 'Fixed Cost Report' + ' ' + pdfTableName + '.pdf',
				image: {
					type: 'jpeg',
					quality: 0.98
				},
				html2canvas: {
					scale: 1, // Keep scale at 1 to capture full width
					scrollX: 0, // Capture entire width including horizontal scroll
					scrollY: 0,
					useCORS: true,
					logging: true
				},
				jsPDF: {
					unit: 'in',
					format: 'a4',
					orientation: 'landscape'
				},
				pagebreak: {
					mode: ['avoid-all', 'css', 'legacy']
				} // Ensure proper page breaks
			};

			// Use html2pdf.js to generate the PDF
			html2pdf()
				.from(updatedTableHtml)
				.set(opt)
				.toPdf()
				.get('pdf')
				.then((pdf) => {
					var totalPages = pdf.internal.getNumberOfPages();
					for (var i = 1; i <= totalPages; i++) {
						pdf.setPage(i);
						pdf.setFontSize(11);
						pdf.setTextColor(100);
						pdf.text(
							'Page ' + i + ' of ' + totalPages,
							pdf.internal.pageSize.getWidth() / 2,
							pdf.internal.pageSize.getHeight() - 10
						);
					}
				})
				.save()
				.finally(() => {
					// Hide the global BusyIndicator
					sap.ui.core.BusyIndicator.hide();
				});
		}

	});
});