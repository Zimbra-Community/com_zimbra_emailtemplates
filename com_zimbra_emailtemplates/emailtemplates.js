/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Zimlets
 * Copyright (C) 2010, 2011, 2013, 2014, 2016 Synacor, Inc.
 *
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at: https://www.zimbra.com/license
 * The License is based on the Mozilla Public License Version 1.1 but Sections 14 and 15
 * have been added to cover use of software over a computer network and provide for limited attribution
 * for the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and limitations under the License.
 * The Original Code is Zimbra Open Source Web Client.
 * The Initial Developer of the Original Code is Zimbra, Inc.  All rights to the Original Code were
 * transferred by Zimbra, Inc. to Synacor, Inc. on September 14, 2015.
 *
 * All portions of the code are Copyright (C) 2010, 2011, 2013, 2014, 2016 Synacor, Inc. All Rights Reserved.
 * ***** END LICENSE BLOCK *****
 */

/**
 * Constructor.
 * 
 * @author Raja Rao DV, maintained and modified by Barry de Graaff
 */
function Com_Zimbra_EmailTemplates() {
}
Com_Zimbra_EmailTemplates.prototype = new ZmZimletBase();
Com_Zimbra_EmailTemplates.prototype.constructor = Com_Zimbra_EmailTemplates;

//--------------------------------------------------------------------------------------------------
// INIT AND INITIALIZE TOOLBAR MENU BUTTON
//--------------------------------------------------------------------------------------------------
Com_Zimbra_EmailTemplates.prototype.init =
function() {
	this._folderPath = this.getUserProperty("etemplates_sourcefolderPath");
   this._folderPathId = this.getUserProperty("etemplates_sourcefolderPathId");
   try {
      var soapDoc = AjxSoapDoc.create("GetFolderRequest", "urn:zimbraMail");
      var search = soapDoc.set("folder");
      appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:Com_Zimbra_EmailTemplates.prototype.createFolder});
   } catch (err)
   {
      console.log('Com_Zimbra_EmailTemplates.prototype.init: failed to create folder');
   } 
};

Com_Zimbra_EmailTemplates.prototype.initializeToolbar =
function(app, toolbar, controller, viewId) {

	if (!this._viewIdAndMenuMap) {
		this._viewIdAndMenuMap = [];
	}

	this.viewId = appCtxt.getViewTypeFromId(viewId);

    this._currentViewId = this.viewId;

	if (this.viewId.indexOf("COMPOSE") >= 0) {
		if (toolbar.getOp("EMAIL_TEMPLATES_ZIMLET_TOOLBAR_BUTTON")) {
			return;
		}
		//get the index of View menu so we can display it after that.
		var buttonIndex = 3;

		//create params obj with button details
		var buttonArgs = {
			text	: this.getMessage("label"),
			tooltip: this.getMessage("EmailTemplatesZimlet_tooltip"),
			index: buttonIndex, //position of the button
			image: "zimbraicon" //icon
		};


		//toolbar.createOp api creates the button with some id and  params containing button details.
		var button = toolbar.createOp("EMAIL_TEMPLATES_ZIMLET_TOOLBAR_BUTTON", buttonArgs);
		var menu = new ZmPopupMenu(button); //create menu
		button.setMenu(menu);//add menu to button
		button.noMenuBar = true;
		this._viewIdAndMenuMap[this.viewId] = {menu:menu, controller:controller, button:button};
		button.removeAllListeners();
		button.removeDropDownSelectionListener();
		button.addSelectionListener(new AjxListener(this, this._addMenuItems, [button, menu]));
		button.addDropDownSelectionListener(new AjxListener(this, this._addMenuItems, [button, menu]));
	}
};

Com_Zimbra_EmailTemplates.prototype._addMenuItems =
function(button, menu) {
	if (!menu._loaded) {
		this._getRecentEmails(false);
		menu._loaded = true;
	// Prevents a condition where the menu exists but has 0 items.
	} else if (menu.getItemCount() <= 0) {
		this._getRecentEmails(true);
		menu._loaded = true;
	} else {
		var bounds = button.getBounds();
		menu.popup(0, bounds.x, bounds.y + bounds.height, false);
	}
};


//--------------------------------------------------------------------------------------------------
// TEST TEMPLATE FOR GENERIC WORDS AND THEN INSERT
//--------------------------------------------------------------------------------------------------
Com_Zimbra_EmailTemplates.prototype._getRecentEmails =
function(removeChildren) {
	if (this._folderPath == "") {
		this._getRecentEmailsHdlr(removeChildren);
		return;
	}

   //the user may have stored the path, but not the id of the folder.
   if (this._folderPathId == "") {
      this.status(this.getMessage("EmailTemplatesZimlet_setTemplatesFolder"), ZmStatusView.LEVEL_WARNING);
      
      this._displayPrefDialog();
      return;
   }
   
	var getHtml = appCtxt.get(ZmSetting.VIEW_AS_HTML);
	var callbck = new AjxCallback(this, this._getRecentEmailsHdlr, removeChildren);
	var _types = new AjxVector();
	_types.add("MSG");

   //using under: instead of in: to support sub-folders
   //under: does not seem to work well on shared accounts/mount points, this is probably a bug: http://lists.zetalliance.org/pipermail/users_lists.zetalliance.org/2018-June/001231.html
	appCtxt.getSearchController().search({query: ["underid:(\"",this._folderPathId,"\")"].join(""), userText: true, limit:50, searchFor: ZmId.SEARCH_MAIL,
		offset:0, types:_types, forceTypes: true, noRender:true, getHtml: getHtml, callback:callbck, errorCallback:callbck});
};

Com_Zimbra_EmailTemplates.prototype._getRecentEmailsHdlr =
function(removeChildren, result) {
	var menu = this._viewIdAndMenuMap[this._currentViewId].menu;

	// Prevents the situation of all the items being added twice to the menu
	if (menu.getItemCount() > 0) removeChildren = true;
	if (removeChildren) {
		menu.removeChildren();
	}
	if (result) {
		if (result instanceof ZmCsfeException) {
			appCtxt.setStatusMsg(this.getMessage("EmailTemplatesZimlet_folderNotExist")+" " + result.getErrorMsg(), ZmStatusView.LEVEL_WARNING);
			this._addStandardMenuItems(menu);
			return;
		}
		var array = result.getResponse().getResults("MSG").getVector().getArray();

      //get the ZmFolder of the ZmMsg so we can sort the result
      for (var i = 0; i < array.length; i++) {
         array[i].folder = appCtxt.getById(array[i].folderId)
      }

      //sort the result
      var orderedArray = [];
      var arrayKeys = [];
      for (var i = 0; i < array.length; i++) {
         array[i].folder = appCtxt.getById(array[i].folderId)
         orderedArray[(array[i].folder.name+array[i].subject).toLowerCase()] = array[i];
         arrayKeys.push((array[i].folder.name+array[i].subject).toLowerCase());
      }     
      arrayKeys.sort()
      array = [];
      for (var i = 0; i < arrayKeys.length; i++) {
         array.push(orderedArray[arrayKeys[i]]);
      }
  

      var currentFolder = "";
      for (var i = 0; i < array.length; i++) {
			var msg = array[i];
			var id = msg.id;
                 
         if(currentFolder!==(array[i].folder.name).toLowerCase() && currentFolder != "")
         {
            menu.createSeparator();
         }
         currentFolder=(array[i].folder.name).toLowerCase();
                 
			var mi = menu.createMenuItem(id, {image:"zimbraIcon", text:msg.folder.name + ' - ' + msg.subject, style:DwtMenuItem.CASCADE_STYLE});
			var submenu = new ZmPopupMenu(mi); //create submenu
			mi.setMenu(submenu);//add submenu to menuitem

			var subMi = submenu.createMenuItem("subMenu_" + Dwt.getNextId(), {image:"Edit", text:this.getMessage("EmailTemplatesZimlet_bodyOnly")});
			subMi.addSelectionListener(new AjxListener(this, this._insertMsg, {msg:msg, insertMode:"body"}));
			subMi = submenu.createMenuItem("subMenu_" + Dwt.getNextId(), {image:"Edit", text:this.getMessage("EmailTemplatesZimlet_bodyAndSubject")});
			subMi.addSelectionListener(new AjxListener(this, this._insertMsg, {msg:msg, insertMode:"bodyAndSubject"}));
			subMi = submenu.createMenuItem("subMenu_" + Dwt.getNextId(), {image:"Edit", text:this.getMessage("EmailTemplatesZimlet_bodySubjectAndParticipants")});
			subMi.addSelectionListener(new AjxListener(this, this._insertMsg, {msg:msg, insertMode:"all"}));
		}
		if (array.length != 0) {
			mi = menu.createMenuItem(id, {style:DwtMenuItem.SEPARATOR_STYLE});
		}      
	}

	this._addStandardMenuItems(menu);

	var button = this._viewIdAndMenuMap[this._currentViewId].button;
	var bounds = button.getBounds();
	menu.popup(0, bounds.x, bounds.y + bounds.height, false);
};

Com_Zimbra_EmailTemplates.prototype._addStandardMenuItems =
function(menu) {
	var mi = menu.createMenuItem("reloadTemplates", {image:"Refresh", text:this.getMessage("EmailTemplatesZimlet_reloadTemplates")});
	mi.addSelectionListener(new AjxListener(this, this._getRecentEmails, true));
	var mi = menu.createMenuItem("preferences", {image:"Preferences", text:this.getMessage("EmailTemplatesZimlet_preferences")});
	mi.addSelectionListener(new AjxListener(this, this._displayPrefDialog));
   var mi = menu.createMenuItem("save", {image:"Save", text:ZmMsg.save});
   mi.addSelectionListener(new AjxListener(this, this._saveTemplate));
   var mi = menu.createMenuItem("image", {image:"ImageDoc", text:ZmMsg.insertImage});
    mi.addSelectionListener(new AjxListener(this, this._inlineImage));
};

//--------------------------------------------------------------------------------------------------
// CREATE BRIEFCASE FOLDER FOR INLINE IMAGES
//--------------------------------------------------------------------------------------------------

Com_Zimbra_EmailTemplates.prototype.createFolder = function (folders)
{
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('com_zimbra_emailtemplates').handlerObject;   
   var hasFolder = false;
   try 
   {
      for(var x=0; x < folders._data.GetFolderResponse.folder[0].folder.length; x++)
      {
         if(folders._data.GetFolderResponse.folder[0].folder[x].name == "Email Templates public")
         {
            hasFolder = true;
            zimletInstance.folderId=folders._data.GetFolderResponse.folder[0].folder[x].id;
         }      
      }
   } catch (err)
   {
      hasFolder = false;
   }

   if (hasFolder == false)
   {
	   var soapDoc = AjxSoapDoc.create("CreateFolderRequest", "urn:zimbraMail");
	   var search = soapDoc.set("folder");
   	search.setAttribute("name",'Email Templates public');
      search.setAttribute("view","document");
      search.setAttribute("l",1);
   	appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:Com_Zimbra_EmailTemplates.prototype.getFolderId});
   }
};

Com_Zimbra_EmailTemplates.prototype.getFolderId = function()
{
   try {
      var soapDoc = AjxSoapDoc.create("GetFolderRequest", "urn:zimbraMail");
      var search = soapDoc.set("folder");
      appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:Com_Zimbra_EmailTemplates.prototype.createFolder});
   } catch (err)
   {
      console.log('Com_Zimbra_EmailTemplates.prototype.init: failed to create folder');
   }   
};

//--------------------------------------------------------------------------------------------------
// SUPPORT INLINE IMAGES VIA BRIEFCASE SHARE WITH MENU OPTION
//--------------------------------------------------------------------------------------------------

Com_Zimbra_EmailTemplates.prototype._inlineImage =
function() {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('com_zimbra_emailtemplates').handlerObject;
   zimletInstance._dialog = new ZmDialog( { title:ZmMsg.insertImage, parent:zimletInstance.getShell(), standardButtons:[DwtDialog.OK_BUTTON], disposeOnPopDown:true } );
   zimletInstance._dialog.setContent('<input type="file" onchange="Com_Zimbra_EmailTemplates.prototype._handleInlineImage(this)" accept="image/x-png,image/gif,image/jpeg">(png/jpg/gif)<br><br><b>'+ZmMsg.share +': ' + ZmMsg.shareWithPublicLong) + '<b>';
   zimletInstance._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(zimletInstance, zimletInstance._NoButtonClicked, [zimletInstance._dialog]));   
   document.getElementById(zimletInstance._dialog.__internalId+'_handle').style.backgroundColor = '#eeeeee';
   document.getElementById(zimletInstance._dialog.__internalId+'_title').style.textAlign = 'center';
   zimletInstance._dialog.popup();
};

Com_Zimbra_EmailTemplates.prototype._handleInlineImage =
function(element) {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('com_zimbra_emailtemplates').handlerObject;
   var soapDoc = AjxSoapDoc.create("CreateFolderRequest", "urn:zimbraMail");
   var search = soapDoc.set("folder");
   var randomName = Com_Zimbra_EmailTemplates.prototype._randomFolderName();
   search.setAttribute("name",randomName);
   search.setAttribute("view","document");
   search.setAttribute("l",zimletInstance.folderId);
   appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:new AjxCallback(Com_Zimbra_EmailTemplates.prototype._shareRandomFolderPublic,[element, randomName])});
};

Com_Zimbra_EmailTemplates.prototype._randomFolderName =
function(element) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 30; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

Com_Zimbra_EmailTemplates.prototype._shareRandomFolderPublic =
function(element, randomName, result) {
   randomFolderId = result.getResponse().CreateFolderResponse.folder[0].id;
   //FolderActionRequest
   var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
   soapDoc.setMethodAttribute("onerror", "continue");
    
   var request = soapDoc.set("FolderActionRequest", null, null, "urn:zimbraMail");
   var action = soapDoc.set("action");
   action.setAttribute("op","grant");
   action.setAttribute("id", randomFolderId);
   var mnode = soapDoc.set("grant", null, action);
   mnode.setAttribute("gt", "pub");
   mnode.setAttribute("inh", "0");
   mnode.setAttribute("perm", "r");
   mnode.setAttribute("pw", "");
   request.appendChild(action);
   appCtxt.getAppController().sendRequest(
   {
      soapDoc : soapDoc,
      asyncMode : true,
      callback : new AjxCallback(Com_Zimbra_EmailTemplates.prototype._inlineImageUpload, [element, randomFolderId, randomName])
   });
               
   
};

Com_Zimbra_EmailTemplates.prototype._inlineImageUpload =
function(element, randomFolderId, randomFolderName) {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('com_zimbra_emailtemplates').handlerObject;
   var file = element.files[0];
   var reader = new FileReader();
   reader.onloadend = function() {      
      var req = new XMLHttpRequest();
      req.open('POST', '/service/upload?fmt=extended,raw', true);
      req.setRequestHeader('Cache-Control', 'no-cache');
      req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      req.setRequestHeader('Content-Type',  'application/octet-stream' + ';');
      req.setRequestHeader('X-Zimbra-Csrf-Token', window.csrfToken);
      req.setRequestHeader('Content-Disposition', 'attachment; filename="'+Com_Zimbra_EmailTemplates.prototype.sanitizeFileName(file.name)+'";');
      req.onload = function() 
      {
         try 
         { 
            var resp = eval('[' + this.responseText + ']'), respObj;
            respObj = resp[2];
            //respObj > ct (content/type) and filename and the zimbra id aid
            if (respObj[0].aid)
            {
               var soapDoc = AjxSoapDoc.create("SaveDocumentRequest", "urn:zimbraMail");
               var doc = soapDoc.set("doc");
               doc.setAttribute("l", randomFolderId);
               var mnode = soapDoc.set("upload", null, doc);
               mnode.setAttribute("id", respObj[0].aid);
               var params = {
                  soapDoc: soapDoc,
                  asyncMode: true,
                  callback:new AjxCallback(Com_Zimbra_EmailTemplates.prototype._inlineImageInsert,[randomFolderName])
               };
               appCtxt.getAppController().sendRequest(params);              
            }
         }
         catch (err)
         {
            console.log('Upload failed'+err);
         }   
      };
      req.send(reader.result);
   }
   reader.readAsArrayBuffer(file);
};

Com_Zimbra_EmailTemplates.prototype._inlineImageInsert =
function(randomFolderName, result) {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('com_zimbra_emailtemplates').handlerObject;
   try{   
      var url = [];
      var i = 0;
      var proto = location.protocol;
      var port = Number(location.port);
      url[i++] = proto;
      url[i++] = "//";
      url[i++] = location.hostname;
      if (port && ((proto == ZmSetting.PROTO_HTTP && port != ZmSetting.HTTP_DEFAULT_PORT) 
         || (proto == ZmSetting.PROTO_HTTPS && port != ZmSetting.HTTPS_DEFAULT_PORT))) {
         url[i++] = ":";
         url[i++] = port;
      }
      url[i++] = "/home/";
      url[i++] = AjxStringUtil.urlComponentEncode(appCtxt.getActiveAccount().name);
      url[i++] = "/Email%20Templates%20public/";
      url[i++] = randomFolderName+"/";
      url[i++] = result.getResponse().SaveDocumentResponse.doc[0].name;
   
      var getUrl = url.join(""); 
      //var img = '<img src="'+getUrl+'" alt="'+getUrl+'">';
      //patched for Zimbra 8.8, it will break existing templates
      var img = '<img dfsrc="'+getUrl+'" alt="inline image">';
      appCtxt.getCurrentView().getHtmlEditor().pasteHtml(img);
   } catch (err)
   {
      console.log('Error uploading file'+err);
   }
   zimletInstance._dialog.popdown();
};

//Sanitize file names so they are allowed in Windows and add %, &, @ , !, ', [, ], (, ), ;, =, +, $, ,, #
Com_Zimbra_EmailTemplates.prototype.sanitizeFileName = function (fileName) {
   //Also remove double spaces
   return fileName.replace(/\\|\/|\:|\*|\?|\"|\<|\>|\||\%|\&|\@|\!|\'|\[|\]|\(|\)|\;|\=|\+|\$|\,|\#/gm,"").replace(/ +(?= )/g,'');
};
      
//--------------------------------------------------------------------------------------------------
// LOAD SELECTED MESSAGE/TEMPLATE
//--------------------------------------------------------------------------------------------------
Com_Zimbra_EmailTemplates.prototype._insertMsg =
function(params) {
	this.msg = params.msg;
	this.msg.load({callback: new AjxCallback(this, this._handleLoadedMsg, params.insertMode)});
};

Com_Zimbra_EmailTemplates.prototype._handleLoadedMsg =
function(insertMode) {
	this.viewId = appCtxt.getCurrentViewId(); // make sure we use proper viewId to support multiple-compose views
	var controller = this._viewIdAndMenuMap[this._currentViewId].controller;
	var composeView = appCtxt.getCurrentView();
	var currentBodyContent = currentBodyContent = appCtxt.getCurrentView().getHtmlEditor().getContent();
	this._composeMode = appCtxt.getCurrentView().getHtmlEditor().getMode();
	var templateBody = this.getTemplateContent(this.msg, this._composeMode);
	var params = {controller:controller, templateSubject:this.msg.subject, templateBody: templateBody,  currentBodyContent:currentBodyContent, composeView:composeView, insertMode:insertMode};
	this._testTemplateContentForKeys(params);
};

//--------------------------------------------------------------------------------------------------
// TEST TEMPLATE FOR GENERIC WORDS AND THEN INSERT
//--------------------------------------------------------------------------------------------------

Com_Zimbra_EmailTemplates.prototype._testTemplateContentForKeys = function(params) {
	//var regex = new RegExp("\\breplace__[a-z0-9A-Z]*", "ig");
	var regex = new RegExp("\\$\\{[-a-zA-Z._0-9]+\\}", "ig");
	var templateBody = params.templateBody;
	var templateSubject = params.templateSubject;
	var bodyArry = templateBody.match(regex);
	var subjectArry;
	if (templateSubject) {
		subjectArry = templateSubject.match(regex);
	}
	if (bodyArry != null || subjectArry != null) {
		params["bodyArry"] = bodyArry;
		params["subjectArry"] = subjectArry;
		this._showReplaceStringsDlg(params);
	} else {
		this._doInsert(params.controller, params.composeView, params.templateSubject, params.templateBody, params.currentBodyContent, params.insertMode);
	}
};

Com_Zimbra_EmailTemplates.prototype._showReplaceStringsDlg =
function(params) {
	if (this.replaceDlg) {
		this.replaceDlg.params = params;
		this._createReplaceView(params);
		this.replaceDlg.popup();
		this._addTabControl();
		return;
	}
	this.replaceDlgView = new DwtComposite(this.getShell());
	this.replaceDlgView.getHtmlElement().style.overflow = "auto";
	this._createReplaceView(params);
	this.replaceDlg = this._createDialog({title:this.getMessage("EmailTemplatesZimlet_replaceTemplateData"), view:this.replaceDlgView, standardButtons:[DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]});
	this.replaceDlg.params = params;
	this.replaceDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._replaceOKBtnListener));
	this.replaceDlg.popup();
	this._addTabControl();

};

Com_Zimbra_EmailTemplates.prototype._createReplaceView =
function(params) {
	var bodyArry = params.bodyArry;
	var subjectArry = params.subjectArry;
	var dataArry = [];
	if (subjectArry != null && subjectArry != undefined) {
		dataArry = subjectArry;
	}
	if (bodyArry != null && bodyArry != undefined) {
		dataArry = dataArry.concat(bodyArry);
	}
	var tmpArry = [];
	for (var j = 0; j < dataArry.length; j++) {
		tmpArry.push(AjxStringUtil.trim(dataArry[j]));
	}
	dataArry = emailtemplates_unique(tmpArry);
	this._replaceFieldIds = [];
	this._replaceFieldIdsMap = [];
	var i = 0;
	var html = new Array();
	html[i++] = "<div class='emailTemplates_yellow'>"+this.getMessage("EmailTemplatesZimlet_replaceGenericData")+"</div><BR/>";
	html[i++] = "<TABLE  class='emailTemplates_table' width=100% cellspacing=3 cellpadding=3>";
	for (var k = 0; k < dataArry.length; k++) {
		var key = dataArry[k];
        key = key.replace(/\$\{([^}]*)\}/, "$1");
		var id = Dwt.getNextId();
		this._replaceFieldIds.push(id);
		this._replaceFieldIdsMap.push({key:key, id:id});
		html[i++] = ["<TR><TD><DIV style='font-weight:bold;'>",key,"</div></TD><TD><input type=text id='",id,"'></input></TD></TR>"].join("");
	}
	html[i++] = "</TABLE>";
	this.replaceDlgView.getHtmlElement().innerHTML = html.join("");
};

/**
 * Adds tab control for Account Preferences' fields
 */
Com_Zimbra_EmailTemplates.prototype._addTabControl =
function() {
	this.replaceDlg._tabGroup.removeAllMembers();
	for (var i = 0; i < this._replaceFieldIds.length; i++) {
		var obj = document.getElementById(this._replaceFieldIds[i]);
		if (obj) {
			this.replaceDlg._tabGroup.addMember(obj);
		}
	}
	this.replaceDlg._tabGroup.addMember(this.replaceDlg.getButton(DwtDialog.OK_BUTTON));
	this.replaceDlg._tabGroup.addMember(this.replaceDlg.getButton(DwtDialog.CANCEL_BUTTON));

	document.getElementById(this._replaceFieldIds[0]).focus();
};

Com_Zimbra_EmailTemplates.prototype._replaceOKBtnListener =
function() {
	var params = this.replaceDlg.params;
	var insertMode = params.insertMode;
	var templateBody = params.templateBody;
	var templateSubject = params.templateSubject;
	var currentBodyContent = params.currentBodyContent;
	for (var i = 0; i < this._replaceFieldIdsMap.length; i++) {
		var obj = this._replaceFieldIdsMap[i];
		var key = "${" + obj.key + "}";
		key = key.replace(/\$\{/,"\\$\\{").replace(/\}$/, "\\}");
		var regEx = new RegExp(key, "ig");
		var val = document.getElementById(obj.id).value;
		if (val == "") {
			continue;
		}
		if (insertMode == "bodyAndSubject" || insertMode == "all") {
			templateSubject = templateSubject.replace(regEx, val);
		}
		templateBody = templateBody.replace(regEx, val);
	}
	this.replaceDlg.popdown();
	this._doInsert(params.controller, params.composeView, templateSubject, templateBody, currentBodyContent, insertMode);
};

Com_Zimbra_EmailTemplates.prototype._doInsert =
function(controller, composeView, templateSubject, templateBody, currentBodyContent, insertMode) {
	//insert subject
	if (insertMode == "bodyAndSubject" || insertMode == "all") {
		if (this.viewId.indexOf("APPT") != -1) {
			composeView._apptEditView._subjectField.setValue(templateSubject);
		} else {
			composeView._subjectField.value = templateSubject;
		}
	}
	//insert from - Support for saving From Persona
	var from = this.msg.getAddress(AjxEmailAddress.FROM);

	// Set composeViewIdentitySelect to the identitySelect for mail or appointment.
	var composeViewIdentitySelect;
	if (this.viewId.includes("APPT"))
		composeViewIdentitySelect = composeView._apptEditView.identitySelect;
	else
		composeViewIdentitySelect = composeView.identitySelect;

	var identities = composeViewIdentitySelect.getOptions().getArray();
	for (var i = 0; i < identities.length; i++) {
		if (identities[i]._displayValue.includes("<" + from.address + ">")) {
			// Set to this identity and break
			composeViewIdentitySelect.setSelectedOption(identities[i]);
			break;
		}
	}

	//insert to & cc
	if (insertMode == "all") {
		var addrs = this.msg.participants.getArray();
		var toStr = [];
		var ccStr = [];
		for (var i = 0; i < addrs.length; i++) {
			var email = addrs[i];
			var name = "";
			if (email.name && email.name != "") {
				name = ["\"",email.name,"\" <", email.address,">"].join("");
			} else {
				name = email.address;
			}
			if (email.type == AjxEmailAddress.TO) {
				toStr.push(name);
			} else if (email.type == AjxEmailAddress.CC) {
				ccStr.push(name);
			}
		}

		if (this.viewId.indexOf("APPT") != -1) {
			try{
				composeView._apptEditView._attInputField.PERSON.setValue(toStr.concat(ccStr).join(";"));
			} catch(e) {
				appCtxt.setStatusMsg(this.getMessage("EmailTemplatesZimlet_couldNotInsertApptAttendees")+" " + result.getErrorMsg(), ZmStatusView.LEVEL_WARNING);
			}
		} else {
			if (toStr.length != 0) {
				composeView.setAddress(AjxEmailAddress.TO, toStr.join(";"));
			}
			if (ccStr.length != 0) {
				composeView.setAddress(AjxEmailAddress.CC, ccStr.join(";"));
			}
		}
	}

	//insert body
	var saperator = "\r\n";
	if ((this._composeMode == Dwt.HTML)) {
		saperator = "</br>";
	}
	if (this.viewId.indexOf("APPT") != -1) {
		//in appt, we append templateBody below currentBodyContent to facilitate things like conf-call templates
		composeView.getHtmlEditor().setContent([currentBodyContent, saperator, templateBody].join(""));
	} else {
		//in email, we append templatebody ABOVE currentBodyContent to facilitate Reply/Fwd emails
		composeView._htmlEditor.setContent([templateBody, saperator, currentBodyContent].join(""));
	}
	if(this.msg.attachments && this.msg.attachments.length > 0) {
		this._isDrafInitiatedByThisZimlet = true;
		controller.saveDraft(ZmComposeController.DRAFT_TYPE_AUTO);
	}
};

Com_Zimbra_EmailTemplates.prototype.addExtraMsgParts =
function(request, isDraft) {
	if(!isDraft || !this._isDrafInitiatedByThisZimlet) {
		return;
	}
	if(request && request.m) {
		if(!request.m.attach) {
			request.m.attach = {};
			request.m.attach.mp = [];
		} else if(!request.m.attach.mp) {
			request.m.attach.mp = [];
		}
		var attmnts = this.msg.attachments;
		if(attmnts) {			
			for(var i = 0; i < attmnts.length; i++) {
				request.m.attach.mp.push({mid:this.msg.id, part:attmnts[i].part});
			}
		}
	}
	this._isDrafInitiatedByThisZimlet = false;
};

Com_Zimbra_EmailTemplates.arrayContainsElement =
function(array, val) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == val) {
			return true;
		}
	}
	return false;
}

function emailtemplates_unique(b) {
	var a = [], i, l = b.length;
	for (i = 0; i < l; i++) {
		if (!Com_Zimbra_EmailTemplates.arrayContainsElement(a, b[i])) {
			a.push(b[i]);
		}
	}
	return a;
}

Com_Zimbra_EmailTemplates.prototype.getTemplateContent = function(note, mode) {
	var body = "";
	var body = note.getBodyContent();
	if (note.isHtmlMail() && mode == ZmMimeTable.TEXT_PLAIN) {
		var div = document.createElement("div");
		div.innerHTML = note.getBodyContent();
		return AjxStringUtil.convertHtml2Text(div);
	} else if (!note.isHtmlMail() && mode == ZmMimeTable.TEXT_HTML) {
		return AjxStringUtil.convertToHtml(note.getBodyContent());
	} else {
		return body;
	}
};

//--------------------------------------------------------------------------------------------------
// SHOW PREFERENCE DIALOG
//--------------------------------------------------------------------------------------------------
Com_Zimbra_EmailTemplates.prototype._displayPrefDialog =
function() {
	if (this.prefDlg) {
		this.prefDlg.popup();
		return;
	}
	this.pView = new DwtComposite(this.getShell());
	//this.pView.setSize("200", "50");
	this.pView.getHtmlElement().style.overflow = "auto";
	this.pView.getHtmlElement().innerHTML = this._createPreferenceView();
	this.prefDlg = this._createDialog({title:this.getMessage("EmailTemplatesZimlet_preferences"), view:this.pView, standardButtons:[DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]});
	this.prefDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._prefOKBtnListener));
	this._initializePrefDialog();
	this.prefDlg.popup();
};

Com_Zimbra_EmailTemplates.prototype._createPreferenceView =
function() {
	var str = "Templates folder not set";
	if (this._folderPath != "") {
		str = this._folderPath;
	}
	var html = new Array();
	var i = 0;
	html.push("<TABLE cellspacing=3 cellpadding=3>",
		"<TR><TD><DIV style='font-weight:bold;'>",this.getMessage("EmailTemplatesZimlet_templateFolderPath"),
		"</div></TD><TD><DIV style='color:blue;font-weight:bold;' id='emailtemplates_folderInfo'>",str,"</div></TD></TR>",
		"<TR><TD colspan=2><DIV id='emailtemplates_folderLookupDiv'></DIV></TD></TR></TABLE>",
		"<br/><div class='emailTemplates_yellow'>",this.getMessage("EmailTemplatesZimlet_genericNames"),"</div><div  class='emailTemplates_yellowNormal'>",
		"<br/>",this.getMessage("EmailTemplatesZimlet_helpLine1"),
		"<br/> ",this.getMessage("EmailTemplatesZimlet_helpLine2"),
		"<br/><br/>",this.getMessage("EmailTemplatesZimlet_helpLine3"),
		"<br/>",this.getMessage("EmailTemplatesZimlet_helpLine4"),
		"<br/>", this.getMessage("EmailTemplatesZimlet_helpLine5"),
		"<br/>", this.getMessage("EmailTemplatesZimlet_helpLine6"));

	return html.join("");
};

Com_Zimbra_EmailTemplates.prototype._initializePrefDialog =
function() {
	var btn = new DwtButton({parent:this.getShell()});
	btn.setText(this.getMessage("EmailTemplatesZimlet_setTemplatesFolder"));
	btn.setImage("Search");
	btn.setToolTipContent(this.getMessage("EmailTemplatesZimlet_selectTemplatesFolder"));
	btn.addSelectionListener(new AjxListener(this, this._setFolderBtnListener));
	document.getElementById("emailtemplates_folderLookupDiv").appendChild(btn.getHtmlElement());
};


Com_Zimbra_EmailTemplates.prototype._prefOKBtnListener =
function() {
	if (this.needRefresh) {
		this.setUserProperty("etemplates_sourcefolderPath", this._folderPath);
      this.setUserProperty("etemplates_sourcefolderPathId", this._folderPathId);
		var callback = new AjxCallback(this, this._handleSaveProperties, this.needRefresh);
		this.saveUserProperties(callback);
	}
	this.prefDlg.popdown();
};

Com_Zimbra_EmailTemplates.prototype._setFolderBtnListener =
function() {
	if (!this._chooseFolderDialog) {
		AjxDispatcher.require("Extras");
		this._chooseFolderDialog = new ZmChooseFolderDialog(appCtxt.getShell());
	}
	this._chooseFolderDialog.reset();
	this._chooseFolderDialog.registerCallback(DwtDialog.OK_BUTTON, this._chooseFolderOkBtnListener, this, this._chooseFolderDialog);

	var params = {
		treeIds:		[ZmOrganizer.FOLDER],
		title:			this.getMessage("EmailTemplatesZimlet_selectTemplatesFolder"),
		overviewId:		this.toString(),
		description:	this.getMessage("EmailTemplatesZimlet_selectTemplatesFolder"),
		skipReadOnly:	false,
		hideNewButton:	false,
		appName:		ZmApp.MAIL,
		omit:			[]
	};
	this._chooseFolderDialog.popup(params);
};

Com_Zimbra_EmailTemplates.prototype._chooseFolderOkBtnListener =
function(dlg, folder) {
	dlg.popdown();
	var fp = folder.getPath();
   var fpId = folder.id;
	this.needRefresh = false;
	if (this._folderPath != fp) {
		this.needRefresh = true;
	}

	if (this._folderPathId != fpId) {
		this.needRefresh = true;
	}   
   
	this._folderPath = fp;
   this._folderPathId = fpId;
   
	document.getElementById("emailtemplates_folderInfo").innerHTML = this._folderPath;
};

Com_Zimbra_EmailTemplates.prototype._handleSaveProperties =
function(needRefresh) {
	appCtxt.setStatusMsg("Preferences Saved", ZmStatusView.LEVEL_INFO);
	if (needRefresh) {
		this.showYesNoDialog();
	}
};

//--------------------------------------------------------------------------------------------------
// SHOW YES NO DIALOG TO REFRESH BROWSER
//--------------------------------------------------------------------------------------------------
Com_Zimbra_EmailTemplates.prototype.showYesNoDialog =
function() {
	var dlg = appCtxt.getYesNoMsgDialog();
	dlg.registerCallback(DwtDialog.YES_BUTTON, this._yesButtonClicked, this, dlg);
	dlg.registerCallback(DwtDialog.NO_BUTTON, this._NoButtonClicked, this, dlg);
	dlg.setMessage(ZmMsg.zimletChangeRestart, DwtMessageDialog.WARNING_STYLE);
	dlg.popup();
};

Com_Zimbra_EmailTemplates.prototype._yesButtonClicked =
function(dlg) {
	dlg.popdown();
	this._refreshBrowser();
};

Com_Zimbra_EmailTemplates.prototype._NoButtonClicked =
function(dlg) {
	dlg.popdown();
};

Com_Zimbra_EmailTemplates.prototype._refreshBrowser =
function() {
	window.onbeforeunload = null;
	var url = AjxUtil.formatUrl({});
	ZmZimbraMail.sendRedirect(url);
};

//--------------------------------------------------------------------------------------------------
// SAVE TEMPLATE TO TEMPLATE FOLDER
//--------------------------------------------------------------------------------------------------

Com_Zimbra_EmailTemplates.prototype._saveTemplate =
function () {

    appCtxt.getCurrentController().saveDraft(
        null,
        null,
        null,
        new AjxCallback(
            this,
            this._doSaveTemplate,
            []
        )
    );

};

Com_Zimbra_EmailTemplates.prototype.status = function(text, type) {
   var transitions = [ ZmToast.FADE_IN, ZmToast.PAUSE, ZmToast.PAUSE, ZmToast.PAUSE, ZmToast.FADE_OUT ];
   appCtxt.getAppController().setStatusMsg(text, type, null, transitions);
}; 

Com_Zimbra_EmailTemplates.prototype._doSaveTemplate =
function () {
   if (this._folderPath == "") {
      this.status(this.getMessage("EmailTemplatesZimlet_setTemplatesFolder"), ZmStatusView.LEVEL_WARNING);
      
      this._displayPrefDialog();
      return;
   }
   
    // When getting the message set isDraft to true.  This will allow the mandatory spell checker
    // to skip the check (which always results in the template being sent).  If mandatory spell checker is turned on.
    var msg = appCtxt.getCurrentView().getMsg(null, true);

    if (msg.subject == "") {

        var dlg = appCtxt.getMsgDialog()
        dlg.setMessage(
            ZmMsg.errorMissingSubject,
            DwtMessageDialog.CRITICAL_STYLE
        );
        dlg.setTitle(
            ZmMsg.errorMissingSubject
        )
        dlg.popup();

        return;

    }

    var folder = this._folderPath;

    if (folder[0] == "/") {

        folder = folder.substr(1, folder.length - 1);

    }

    // Move mail to template folder and reload templates afterwards

    msg.move(
        appCtxt.getFolderTree().getByPath(folder).id,
        new AjxCallback(
            this,
            this._getRecentEmails,
            []
        )
    );
/*
 * removed as the messages EmailTemplatesZimlet_saved are not upstream, and we do not need this dialog
    var dlg = appCtxt.getMsgDialog();
    dlg.setMessage(
        this.getMessage("EmailTemplatesZimlet_saved"),
        DwtMessageDialog.INFO_STYLE
    );
    dlg.setTitle(this.getMessage("EmailTemplatesZimlet_saved_title"));
    dlg.popup();
*/
};

Com_Zimbra_EmailTemplates.prototype.singleClicked =
function (canvas) {

    this._displayPrefDialog();


};

Com_Zimbra_EmailTemplates.prototype.doubleClicked =
function (canvas) {

    this._displayPrefDialog();


};
