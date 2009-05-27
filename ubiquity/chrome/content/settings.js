/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://ubiquity/modules/msgservice.js");
Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");

var {skinService} = UbiquitySetup.createServices();
var msgService = new AlertMessageService();

$(onDocumentLoad);

function onDocumentLoad() {
  loadSkinList();
  // set the language option controls to the correct values:
  var parserVersion = UbiquitySetup.parserVersion;
  $("#use-new-parser-checkbox").attr('checked', ( parserVersion == 2 ));
  if (parserVersion == 2) {
    $("#language-select").removeAttr("disabled");
    var langCode = UbiquitySetup.languageCode;
    $("#language-select").find("option").each(
      function() {
        $(this).attr("selected", ($(this).attr("value") == langCode));
      }
    );
  }
  // set the usage-data-collection option to the correct value:
  var prefs = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefService);
  prefs = prefs.getBranch("extensions.ubiquity.");
  var collect = prefs.getBoolPref("collectUsageData");
  $("#allow-data-collection-checkbox").attr('checked', collect);
}

function changeDataCollectionSettings() {
  var prefs = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefService);
  prefs = prefs.getBranch("extensions.ubiquity.");
  var collect = $("#allow-data-collection-checkbox").attr('checked');
  prefs.setBoolPref("collectUsageData", collect);
}

function changeLanguageSettings() {
  var changed = false;
  var prefs = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefService);
  prefs = prefs.getBranch("extensions.ubiquity.");

  var useParserVersion = $("#use-new-parser-checkbox").attr('checked') ?2:1;
  if ( useParserVersion != prefs.getIntPref("parserVersion") ) {
    changed = true;
    prefs.setIntPref("parserVersion", useParserVersion);
  }

  var useLanguage = $("#language-select").val();
  if ( useLanguage != prefs.getCharPref("language")) {
    changed = true;
    prefs.setCharPref("language", useLanguage);
  }

  if (changed) {
    $("#lang-settings-changed-info").html(
      "<i>This change will take effect when you restart Firefox.</i>"
    );
  } else {
    $("#lang-settings-changed-info").empty();
  }
}

function loadSkinList() {
  var {CUSTOM_SKIN, currentSkin, skinList} = skinService;
  var i = 0;
  $("#skin-list").empty();
  for each (let {local_uri, download_uri} in skinList)
    if (local_uri !== CUSTOM_SKIN)
      createSkinElement(local_uri, download_uri, i++);
  createSkinElement(CUSTOM_SKIN, CUSTOM_SKIN, i);
  checkSkin(currentSkin);
  //If current skin is custom skin, auto-open the editor
  if (currentSkin === CUSTOM_SKIN)
    openSkinEditor();
}

// Thanks to code by Torisugari at
// http://forums.mozillazine.org/viewtopic.php?p=921150#921150
function readFile(url) {
  var ioService = (Cc["@mozilla.org/network/io-service;1"]
                   .getService(Ci.nsIIOService));
  var scriptableStream = (Cc["@mozilla.org/scriptableinputstream;1"]
                          .getService(Ci.nsIScriptableInputStream));
  var channel = ioService.newChannel(url,null,null);
  var input = channel.open();
  scriptableStream.init(input);
  var str = scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return str;
}

function createSkinElement(filepath, origpath, id) {
  try {
    var css = readFile(filepath);
  } catch(e) {
    //If file cannot be read, just move on to the next skin
    return;
  }

  var skinMeta = {
    name: filepath,
    homepage: origpath,
  };
  //look for =skin= ~ =/skin= indicating metadata
  var [, metaData] = /=skin=\s+([^]+)\s+=\/skin=/(css) || 0;
  if (metaData)
    while(/^\s*@(\S+)\s+(.+)/mg.test(metaData))
      skinMeta[RegExp.$1] = RegExp.$2;

  var skinId = "skin_" + id;

  $('#skin-list').append(
     '<div class="command" id="' + skinId + '">' +
     ('<input type="radio" name="skins" id="rad_' + skinId +
      '" value="' + filepath + '"></input>') +
     '<label class="label light" for="rad_'+ skinId + '">' +
     '<a class="name"/><br/>' +
     '<span class="author"/><span class="license"/></label>' +
     '<div class="email light"></div>' +
     '<div class="homepage light"></div></div>'
    );

  var skinEl = $("#" + skinId);

  //Add the name and onclick event
  skinEl.find(".name").text(skinMeta.name);
  skinEl.find("input").attr("onclick",
                            "skinService.changeSkin('" + filepath + "')");

  if (skinMeta.author)
    skinEl.find(".author").text("by " + skinMeta.author);

  if (skinMeta.email)
    skinEl.find(".email")[0].innerHTML = (
      <>email: <a href={'mailto:' + skinMeta.email}
      >{skinMeta.email}</a></>);

  if (skinMeta.license)
    skinEl.find(".license").text(" licensed as " + skinMeta.license);

  if (skinMeta.homepage)
    skinEl.find(".homepage")[0].innerHTML =
      <a href={skinMeta.homepage}>{skinMeta.homepage}</a>.toXMLString();

  skinEl.append(<a class="action" href={"view-source:" + filepath}
                target="_blank">[view source]</a>.toXMLString());

  if (filepath !== origpath) (
    $("<a class='action'>[uninstall]</a>")
    .click(function uninstall() {
      var before = skinService.currentSkin;
      skinService.uninstall(filepath);
      var after = skinService.currentSkin;
      if (before !== after) checkSkin(after);
      skinEl.slideUp();
    })
    .appendTo(skinEl.append(" ")));
}

function checkSkin(url) {
  $("#skin-list input:radio").each(function() {
    if (this.value === url) {
      this.checked = true;
      return false;
    }
  });
}

function saveCustomSkin() {
  var data = $("#skin-editor").val();
  var MY_ID = "ubiquity@labs.mozilla.com";
  var file = (Cc["@mozilla.org/extensions/manager;1"]
              .getService(Ci.nsIExtensionManager)
              .getInstallLocation(MY_ID)
              .getItemFile(MY_ID, "chrome/skin/skins/custom.css"));
  var foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(Ci.nsIFileOutputStream));
  foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
  foStream.write(data, data.length);
  foStream.close();

  msgService.displayMessage("Your skin has been saved!");
  loadSkinList();
  if (skinService.currentSkin === skinService.CUSTOM_SKIN)
    skinService.loadCurrentSkin();
}

function pasteToGist() {
  var data = $("#skin-editor").val();
  var name = (/@name[ \t]+(.+)/(data) || 0)[1];
  var ext = ".css";
  Utils.openUrlInBrowser(
    "http://gist.github.com/gists/",
    ["file_" + key + "[gistfile1]=" + encodeURIComponent(val)
     for each([key, val] in Iterator({
       ext: ext,
       name: (name || "ubiquity-skin") + ext,
       contents: data,
     }))].join("&"));
}

function openSkinEditor() {
  $('#editor-div').show();
  $("#skin-editor").val(readFile(skinService.CUSTOM_SKIN)).focus();
  $('#edit-button').hide();
}

function saveAs() {
  try {
    skinService.saveAs($("#skin-editor").val(), "custom");
    loadSkinList();
  } catch(e) {
    msgService.displayMessage("Error saving your skin");
    Cu.reportError(e);
  }
}
