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
 *   Aza Raskin <aza@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
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

// = ContextUtils =
// A small library that deals with selection via {{{context}}}.
//
// {{{context}}} is a dictionary which must contain
// {{{focusedWindow}}} and {{{focusedElement}}} fields.

var EXPORTED_SYMBOLS = ["ContextUtils"];

var ContextUtils = {};

for each (let f in this) if (typeof f === "function") ContextUtils[f.name] = f;

Components.utils.import("resource://ubiquity/modules/utils.js");

// === {{{ ContextUtils.getHtmlSelection(context) }}} ===

function getHtmlSelection(context) {
  var range = getFirstRange(context);
  if (!range) return "";

  var newNode = context.focusedWindow.document.createElement("div");
  newNode.appendChild(range.cloneContents());
  range.detach();
  return absolutifyUrlsInNode(newNode).innerHTML;
}

// === {{{ ContextUtils.getSelection(context) }}} ===

function getSelection(context) {
  var {focusedElement} = context;
  if (isTextBox(focusedElement)) {
    let {selectionStart: ss, selectionEnd: se} = focusedElement;
    if (ss !== se) return focusedElement.value.slice(ss, se);
  }

  var range = getFirstRange(context);
  if (range) {
    let result = range.toString();
    range.detach();
    return result;
  }

  return "";
}

// === {{{ ContextUtils.setSelection(context, content, options) }}} ===
// Replaces the current selection with {{{content}}}.
// Returns {{{true}}} if succeeds, {{{false}}} if not.
//
// {{{content}}} is the HTML string.
//
// {{{options}}} is a dictionary; if it has a {{{text}}} property then
// that value will be used in place of the HTML if we're in
// a plain-text only editable field.

function setSelection(context, content, options) {
  var {focusedWindow, focusedElement} = context;

  if (focusedWindow && focusedWindow.document.designMode === "on") {
    focusedWindow.document.execCommand("insertHTML", false, content);
    return true;
  }

  if (isTextBox(focusedElement)) {
    let plainText = options && options.text;
    if (!plainText) {
      let html = (focusedElement.ownerDocument
                  .createElementNS("http://www.w3.org/1999/xhtml", "html"));
      html.innerHTML = "<div>" + content + "</div>";
      plainText = html.textContent;
    }
    let {value, scrollTop, scrollLeft, selectionStart} = focusedElement;
    focusedElement.value = (
      value.slice(0, selectionStart) + plainText +
      value.slice(focusedElement.selectionEnd));
    focusedElement.selectionStart = selectionStart;
    focusedElement.selectionEnd = selectionStart + plainText.length;
    focusedElement.scrollTop = scrollTop;
    focusedElement.scrollLeft = scrollLeft;
    return true;
  }

  if (!focusedWindow) return false;

  var sel = focusedWindow.getSelection();
  if (!sel.rangeCount) return false;

  var range = sel.getRangeAt(0);
  var fragment = range.createContextualFragment(content);
  sel.removeRange(range);
  range.deleteContents();
  var {lastChild} = fragment;
  if (lastChild) {
    range.insertNode(fragment);
    range.setEndAfter(lastChild);
  }
  sel.addRange(range);
  return true;
}

// === {{{ ContextUtils.getSelectionObject(context) }}} ===
// Returns an object that bundles up both the plain-text and HTML
// selections.  If there is no html selection, the plain-text selection
// is used for both.

function getSelectionObject(context) {
  var selection = getSelection(context);
  return {
    text: selection,
    html: getHtmlSelection(context) || Utils.escapeHtml(selection),
  };
}

// === {{{ ContextUtils.getFirstRange(context) }}} ===
// Returns a copy of the first {{{Range}}} in {{{Selection}}}.

function getFirstRange(context) {
  var win = context.focusedWindow;
  var sel = win && win.getSelection();
  if (!sel || !sel.rangeCount) return null;

  var range = sel.getRangeAt(0);
  var newRange = win.document.createRange();
  newRange.setStart(range.startContainer, range.startOffset);
  newRange.setEnd(range.endContainer, range.endOffset);
  return newRange;
}

// ==== {{{ ContextUtils.absolutifyUrlsInNode(node) }}} ====
// Takes all the URLs specified as attributes in descendants of
// the given DOM and convert them to absolute URLs. This
// is a fix for [[http://ubiquity.mozilla.com/trac/ticket/551|#551]].

function absolutifyUrlsInNode(node) {
  var attrs = ["href", "src", "action"];
  for each (let n in Array.slice(node.getElementsByTagName("*")))
    for each (let a in attrs)
      if (a in n) {
        n.setAttribute(a, n[a]);
        break;
      }
  return node;
}

// === {{{ ContextUtils.isTextBox(node) }}} ===

function isTextBox(node) {
  try { return typeof node.selectionEnd === "number" } catch (_) {}
  return false;
}
