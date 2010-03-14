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
 *   Atul Varma <atul@mozilla.com>
 *   Michael Kaply <mozilla@kaply.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

// = Ubiquity =
// Creates a Ubiquity interface and binds it to the given message
// panel and text box.
//
// {{{msgPanel}}} should be a <xul:panel/>.
//
// {{{textBox}}} should be a <input type="text"/>.
//
// {{{cmdManager}}} is the {{{CommandManager}}} instance.

function Ubiquity(msgPanel, textBox, cmdManager) {
  Cu.import("resource://ubiquity/modules/utils.js", this);

  this.__msgPanel = msgPanel;
  this.__textBox = textBox;
  this.__cmdManager = cmdManager;
  this.__needsToExecute = false;
  this.__lastValue = "";
  this.__previewTimerID = -1;
  this.__lastKeyEvent = {};
  this.__prefs = this.Utils.prefs;

  window.addEventListener("mousemove", this, false);

  textBox.addEventListener("keydown", this, false);
  textBox.addEventListener("keypress", this, false);
  textBox.addEventListener("keyup", this, false);

  msgPanel.addEventListener("popupshowing", this, false);
  msgPanel.addEventListener("popupshown", this, false);
  msgPanel.addEventListener("popuphidden", this, false);
  msgPanel.addEventListener("click", this, false);

  var self = this;
  self.__onSuggestionsUpdated = function U__onSuggestionsUpdated() {
    cmdManager.onSuggestionsUpdated(textBox.value, self.__makeContext());
  };
}

Ubiquity.prototype = {
  constructor: Ubiquity,
  toString: function U_toString() "[object Ubiquity]",

  __DEFAULT_INPUT_DELAY: 50,
  __DEFAULT_INPUT_LIMIT: 512,

  __KEYCODE_ENTER: KeyEvent.DOM_VK_RETURN,
  __KEYCODE_TAB  : KeyEvent.DOM_VK_TAB,

  __KEYMAP_MOVE_INDICATION: {
    38: "moveIndicationUp",
    40: "moveIndicationDown",
  },
  __KEYMAP_SCROLL_RATE: {
    33: -.8, // page up
    34: +.8, // page dn
  },

  handleEvent: function U_handleEvent(event) {
    if (this["__on" + event.type](event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  // == Read Only Properties ==

  // === {{{ Ubiquity#textBox }}} ===
  get textBox U_getTextBox() this.__textBox,

  // === {{{ Ubiquity#msgPanel }}} ===
  get msgPanel U_getPanel() this.__msgPanel,

  // === {{{ Ubiquity#cmdManager }}} ===
  get cmdManager U_getCmdManager() this.__cmdManager,

  // === {{{ Ubiquity#lastKeyEvent }}} ===
  // The last captured key event on the {{{textBox}}}.
  get lastKeyEvent U_getLastKeyEvent() this.__lastKeyEvent,

  // === {{{ Ubiquity#isWindowOpen }}} ===
  get isWindowOpen U_getIsWindowOpen()
    this.__msgPanel.state in this.__STATES_OPEN,
  __STATES_OPEN: {open: 1, showing: 1},

  // === {{{ Ubiquity#inputDelay }}} ===
  // Delay between the user's last keyup and parsing in milliseconds.
  get inputDelay U_getInputDelay() this.__prefs.getValue(
    "extensions.ubiquity.inputDelay", this.__DEFAULT_INPUT_DELAY),

  // === {{{ Ubiquity#inputLimit }}} ===
  // Input length where Ubiquity starts to hesitate parsing. See #507.
  get inputLimit U_getInputLimit() this.__prefs.getValue(
    "extensions.ubiquity.inputLimit", this.__DEFAULT_INPUT_LIMIT),

  __onmousemove: function U__onMouseMove(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onkeydown: function U__onKeyDown(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    var move = this.__KEYMAP_MOVE_INDICATION[keyCode];
    if (move) {
      this.__cmdManager[move](this.__makeContext());
      return true;
    }
    if (keyCode === this.__KEYCODE_TAB) {
      var {completionText} = this.__cmdManager.hilitedSuggestion || 0;
      if (completionText) this.__textBox.value = completionText;
      return true;
    }
  },

  __onkeyup: function U__onKeyup(event) {
    var {keyCode} = this.__lastKeyEvent = event;

    if (keyCode >=  KeyEvent.DOM_VK_DELETE ||
        keyCode === KeyEvent.DOM_VK_SPACE ||
        keyCode === KeyEvent.DOM_VK_BACK_SPACE ||
        keyCode === KeyEvent.DOM_VK_RETURN && !this.__needsToExecute)
      // Keys that would change input. RETURN is for IME.
      // https://developer.mozilla.org/En/DOM/Event/UIEvent/KeyEvent
      this.__processInput();
  },

  __onkeypress: function U__onKeyPress(event) {
    var {keyCode, which} = event;

    if (event.ctrlKey && event.altKey && which &&
        this.__cmdManager.previewer.activateAccessKey(which))
      return true;

    if (keyCode === this.__KEYCODE_ENTER) {
      this.__processInput(true);
      this.__needsToExecute = true;
      this.__msgPanel.hidePopup();
      return true;
    }
    var rate = this.__KEYMAP_SCROLL_RATE[keyCode];
    if (rate) {
      let [x, y] = event.shiftKey ? [rate, 0] : [0, rate];
      this.__cmdManager.previewer.scroll(x, y);
      return true;
    }
  },

  __delayedProcessInput: function U__delayedProcessInput(self, context) {
    var input = self.__textBox.value;
    if (input.length > self.inputLimit ||
        input && input === self.__lastValue) return;

    self.__cmdManager.updateInput(
      self.__lastValue = input,
      context || self.__makeContext(),
      self.__onSuggestionsUpdated);
  },

  __processInput: function U__processInput(immediate, context) {
    clearTimeout(this.__previewTimerID);
    if (immediate)
      this.__delayedProcessInput(this, context);
    else
      this.__previewTimerID = setTimeout(
        this.__delayedProcessInput, this.inputDelay, this, context);
  },

  __makeContext: function U__makeContext(ensureFocus) {
    return {
      screenX: this.__x,
      screenY: this.__y,
      chromeWindow: window,
      focusedWindow : this.__focusedWindow  ||
        (ensureFocus ? document.commandDispatcher.focusedWindow  : null),
      focusedElement: this.__focusedElement ||
        (ensureFocus ? document.commandDispatcher.focusedElement : null),
    }
  },

  __onpopuphidden: function U__onHidden() {
    clearTimeout(this.__previewTimerID);
    this.__cmdManager.remember();
    if (this.__needsToExecute) {
      this.__needsToExecute = false;
      this.execute();
    }
    else this.__cmdManager.reset();

    var unfocused = this.__focusedWindow;
    if (unfocused) unfocused.focus();
    this.__focusedWindow = this.__focusedElement = null;
  },

  __onpopupshowing: function U__onShowing() {
    this.__cmdManager.refresh();
    this.__lastValue = "";
    this.__processInput(true);
  },

  __onpopupshown: function U__onShown() {
    this.__textBox.focus();
    this.__textBox.select();
  },

  __onclick: function U__onClick(event) {
    // left: open link / execute; middle: same but without closing panel
    var {button, target, view} = event;
    if (button === 2) return;
    if (view.location.href === "chrome://ubiquity/content/suggest.html") {
      for (let lm = target, hilited = /\bhilited\b/;; lm = lm.parentNode) {
        if (!lm || !("className" in lm)) return;
        if (hilited.test(lm.className)) break;
      }
      this.execute();
    }
    else {
      do var {href} = target; while (!href && (target = target.parentNode));
      if (!href ||
          ~href.lastIndexOf("javascript:", 0) ||
          ~href.lastIndexOf("resource://ubiquity/preview.html#", 0)) return;
      this.Utils.openUrlInBrowser(href);
    }
    if (button === 0) this.closeWindow();
    return true;
  },

  // == Public Methods ==

  setLocalizedDefaults: function U_setLocalizedDefaults(langCode) {},

  // === {{{ Ubiquity#execute(input) }}} ===
  // Executes {{{input}}} or the highlighted suggestion.
  // If {{{input}}} is provided but empty, the current entry is used instead.

  execute: function U_execute(input) {
    var external = input != null;
    var context = this.__makeContext(external);
    if (external) {
      if (input) this.__textBox.value = input;
      this.__lastValue = "";
      this.__processInput(true, context);
    }
    this.__cmdManager.execute(context);
  },

  // === {{{ Ubiquity#preview(input, immediate) }}} ===
  // Previews {{{input}}} or the highlighted suggestion,
  // skipping the input delay if {{{immediate}}} evaluates to {{{true}}}
  // and opening Ubiquity if it's closed.

  preview: function U_preview(input, immediate) {
    if (input != null) this.__textBox.value = input;
    if (this.isWindowOpen)
      this.__processInput(immediate);
    else
      this.openWindow();
  },

  // === {{{ Ubiquity#openWindow() }}} ===

  openWindow: function U_openWindow() {
    ({focusedWindow : this.__focusedWindow,
      focusedElement: this.__focusedElement}) = document.commandDispatcher;
    var xy = this.__prefs.getValue("extensions.ubiquity.openAt", "");
    if (xy) {
      let [x, y] = xy.split(",");
      this.__msgPanel.openPopupAtScreen(x, y);
    }
    else {
      // This is a temporary workaround for #43.
      var anchor = document.getElementById("content").selectedBrowser;
      this.__msgPanel.openPopup(anchor, "overlap", 0, 0, false, true);
    }
  },

  // === {{{ Ubiquity#closeWindow() }}} ===

  closeWindow: function U_closeWindow() {
    this.__msgPanel.hidePopup();
  },

  // === {{{ Ubiquity#toggleWindow() }}} ===

  toggleWindow: function U_toggleWindow() {
    if (this.isWindowOpen)
      this.closeWindow();
    else
      this.openWindow();
  },
};
