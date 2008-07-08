// This script is loaded into a Ubiquity sandbox once all other
// code has been injected into it, so that it can perform any
// necessary post-processing and other finalization on the
// contents of the sandbox.

// Assign a default command icon for anything that doesn't explicitly
// have an icon set.

var CMD_PREFIX = "cmd_";
var DEFAULT_CMD_ICON = "";

for (name in this)
  if (name.indexOf(CMD_PREFIX) == 0) {
    var cmd = this[name];

    if (!cmd.icon)
      cmd.icon = DEFAULT_CMD_ICON;
  }

if (window.location == "chrome://browser/content/browser.xul") {
  function callRunOnceFunctions(scopeObj, prefix) {
    if (!scopeObj.hasRunOnce) {
      scopeObj.hasRunOnce = true;
      for (name in this) {
        if (name.indexOf(prefix) == 0 && typeof(this[name]) == "function") {
          this[name]();
        }
      }
    }
  }
  // Configure all functions starting with "startup_" to be called on
  // Firefox startup.
  callRunOnceFunctions(globals, "startup_");

  // Configure all functions starting with "windowOpen_" to be called
  // whenever a browser window is opened.
  callRunOnceFunctions(windowGlobals, "windowOpen_");
} else {
  // We're being included in an HTML page.  Yes, this is a hack, but
  // this solution is temporary anyways.

  function onDocumentLoad() {
    // Dynamically generate entries for undocumented commands.
    for (name in window)
      if (name.indexOf(CMD_PREFIX) == 0) {
        var cmd = window[name];
        var cmdName = name.substr(CMD_PREFIX.length);
        var cmdQuery = $("#" + name);

        if (cmdQuery.length == 0) {
          cmdName = cmdName.replace(/_/g, " ");
          $(document.body).append(
            ('<div class="command" id="' + name + '">' +
             '<span class="name">' + cmdName + '</span>')
          );
          cmdQuery = $("#" + name);
        }

        if (cmd.icon && cmdQuery.children(".icon").length == 0) {
          cmdQuery.prepend('<img class="icon" src="' + cmd.icon + '"/> ');
        }
      }
  }

  $(document).ready(onDocumentLoad);
}