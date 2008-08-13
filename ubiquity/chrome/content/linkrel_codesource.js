const CMD_CONFIRMED_ANNO = "ubiquity/confirmed";
const CMD_URL_ANNO = "ubiquity/commands";
const WARNING_URL = "chrome://ubiquity/content/confirm-add-command.html";

function LinkRelCodeSource() {
  LinkRelCodeSource.__install(window);

  this._sources = {};

  this._updateSourceList = function LRCS_updateSourceList() {
    let annSvc = LinkRelCodeSource.__getAnnSvc();
    let newSources = {};
    let markedPages = annSvc.getPagesWithAnnotation(CMD_CONFIRMED_ANNO, {});
    // I think getPagesWithAnnotation should return list of URIs, right?
    for each (let uri in markedPages) {

      let href = uri.spec;
      dump("href is " + href);
      dump("\nuri.scheme is " + uri.scheme + "\n");
      if (this._sources[href]) {
        newSources[href] = this._sources[href];
      } else if (uri.scheme == "http" ||
                 uri.scheme == "https") {
        newSources[href] = new RemoteUriCodeSource(href);
      } else if (uri.scheme == "file" ||
                 uri.scheme == "chrome" ||
                 uri.scheme == "resource") {
        newSources[href] = new LocalUriCodeSource(href);
      }
    }
    this._sources = newSources;
  };

  this.getCode = function LRCS_getCode() {
    this._updateSourceList();

    var code = "";
    for each (source in this._sources)
      code += source.getCode() + "\n";

    return code;
  };
}

LinkRelCodeSource.__getAnnSvc = function LRCS_getAnnSvc() {
  var Cc = Components.classes;
  var annSvc = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Components.interfaces.nsIAnnotationService);
  return annSvc;
};

LinkRelCodeSource.__install = function LRCS_install(window) {
  if (LinkRelCodeSource.__isInstalled)
    return;

  function showNotification(targetDoc, commandsUrl) {
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    // Find the <browser> which contains notifyWindow, by looking
    // through all the open windows and all the <browsers> in each.
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    var tabbrowser = null;
    var foundBrowser = null;

    while (!foundBrowser && enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      tabbrowser = win.getBrowser();
      foundBrowser = tabbrowser.getBrowserForDocument(targetDoc);
    }

    // Return the notificationBox associated with the browser.
    if (foundBrowser) {
      var box = tabbrowser.getNotificationBox(foundBrowser);
      // Clicking on "subscribe" takes them to the warning page:
      var confirmUrl = WARNING_URL + "?url=" + targetDoc.URL + "&sourceUrl="
			 + commandsUrl;
      var buttons = [
        {accessKey: null,
         callback: function() {
	   Utils.openUrlInBrowser(confirmUrl);
	 },
         label: "Subscribe...",
         popup: null}
      ];
      box.appendNotification(
        ("This page contains Ubiquity commands.  " +
         "If you'd like to subscribe to them, please " +
         "click the button to the right."),
        "ubiquity_notify_commands_available",
        "http://www.mozilla.com/favicon.ico",
        box.PRIORITY_INFO_MEDIUM,
        buttons
      );
    } else {
      Components.utils.reportError("Couldn't find tab for document");
    }
  }

  // Watch for any tags of the form <link rel="commands">
  // on pages and add annotations for them if they exist.
  function onLinkAdded(event) {
    if (event.target.rel != "commands")
      return;

    var annSvc = LinkRelCodeSource.__getAnnSvc();
    var url = Utils.url(event.target.baseURI);
    var commandsUrl = event.target.href;
    annSvc.setPageAnnotation(url, CMD_URL_ANNO,
                             commandsUrl, 0, annSvc.EXPIRE_WITH_HISTORY);
    // TODO: Check to see if another annotation, like "ubiquity/confirmed",
    // is set; if it's not, then show the notification.
    showNotification(event.target.ownerDocument, commandsUrl);
  }

  window.addEventListener("DOMLinkAdded", onLinkAdded, false);
  LinkRelCodeSource.__isInstalled = true;
};

LinkRelCodeSource.__isInstalled = false;