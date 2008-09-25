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
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
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

// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

function cmd_bold() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("bold", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_bold.description = "If you're in a rich-text-edit area, makes the selected text bold.";
cmd_bold.icon = "chrome://ubiquity/skin/icons/text_bold.png";

function cmd_italic() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("italic", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_italic.description = "If you're in a rich-text-edit area, makes the selected text italic.";
cmd_italic.icon = "chrome://ubiquity/skin/icons/text_italic.png";

function cmd_underline() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("underline", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_underline.description = "If you're in a rich-text-edit area, underlines the selected text.";
cmd_underline.icon = "chrome://ubiquity/skin/icons/text_underline.png";

function cmd_undo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("undo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_undo.description = "Undoes your latest style/formatting or page-editing changes.";
cmd_undo.icon = "chrome://ubiquity/skin/icons/arrow_undo.png";

function cmd_redo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("redo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}
cmd_redo.description = "Redoes your latest style/formatting or page-editing changes.";
cmd_redo.icon = "chrome://ubiquity/skin/icons/arrow_redo.png";


CmdUtils.CreateCommand({
  name: "calculate",
  takes: {"expression": noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  description: "Calculates the value of a mathematical expression.",
  help: "Try it out: issue &quot;calc 22/7 - 1&quot;.",
  preview: function(previewBlock, directObject) {
    var expression = directObject.text;

    if(expression.length < 1) {
      previewBlock.innerHTML = "Calculates an expression. E.g., 22/7.";
      return;
    }

  var previewTemplate = "${expression} = <b>${result}</b>" +
    "{if error}<p><b>Error:</b> ${error}</p>{/if}";

  var result = "?";
  var error = null;
  try {
    var parser = new MathParser();

    result = parser.parse(expression);

    if(isNaN(result))
      throw new Error("Invalid expression");
  } catch(e) {
    error = e.message;
    result = "?";
  }

  var previewData = {
    "expression": expression,
    "result": result,
    "error": error
  }

  previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

  },
  execute: function( directObj ) {

    var expression = directObject.text;

    if(expression.length < 1) {
      displayMessage("Requires a expression.");
      return;
    }

  try {
    var parser = new MathParser();
    var result = parser.parse(expression) + "";

    if(isNaN(result))
      throw new Error("Invalid expression");

    CmdUtils.setSelection(result);
    CmdUtils.setLastResult(result);
  } catch(e) {
    displayMessage("Error calculating expression: " + expression)
  }

  }
});

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/classes/math-parser [rev. #2]
MathParser = function(){
  var o = this, p = o.operator = {};
  p["+"] = function(n, m){return n + m;}
  p["-"] = function(n, m){return n - m;}
  p["*"] = function(n, m){return n * m;}
  p["/"] = function(m, n){return n / m;}
  p["%"] = function(m, n){return n % m;}
  p["^"] = function(m, n){return Math.pow(n, m);}
  p["~"] = function(m, n){return Math.sqrt(n, m);}
  o.custom = {}, p.f = function(s, n){
    if(Math[s]) return Math[s](n);
    else if(o.custom[s]) return o.custom[s].apply(o, n);
    else throw new Error("Function \"" + s + "\" not defined.");
  }, o.add = function(n, f){this.custom[n] = f;}
};
MathParser.prototype.eval = function(e){
  var e = e.split(""), v = [], p = [], a, c = 0, s = 0, x, t, d = 0;
  var n = "0123456789.", o = "+-*/^%~", f = this.operator;
  for(var i = 0, l = e.length; i < l; i++)
    if(o.indexOf(e[i]) > -1)
      e[i] == "-" && (s > 1 || !d) && ++s, !s && d && (p.push(e[i]), s = 2), "+-".indexOf(e[i]) < (d = 0) && (c = 1);
    else if(a = n.indexOf(e[i]) + 1 ? e[i++] : ""){
      while(n.indexOf(e[i]) + 1) a += e[i++];
      v.push(d = (s & 1 ? -1 : 1) * a), c && v.push(f[p.pop()](v.pop(), v.pop())) && (c = 0), --i, s = 0;
    }
  for(c = v[0], i = 0, l = p.length; l--; c = f[p[i]](c, v[++i]));
  return c;
};
MathParser.prototype.parse = function(e){
  var p = [], f = [], ag, n, c, a, o = this, v = "0123456789.+-*/^%~(, )";
  for(var x, i = 0, l = e.length; i < l; i++){
    if(v.indexOf(c = e.charAt(i)) < 0){
      for(a = c; v.indexOf(c = e.charAt(++i)) < 0; a += c); f.push((--i, a));
    }
    else if(!(c == "(" && p.push(i)) && c == ")"){
      if(a = e.slice(0, (n = p.pop()) - (x = v.indexOf(e.charAt(n - 1)) < 0 ? y = (c = f.pop()).length : 0)), x)
        for(var j = (ag = e.slice(n, ++i).split(",")).length; j--; ag[j] = o.eval(ag[j]));
      l = (e = a + (x ? o.operator.f(c, ag) : o.eval(e.slice(n, ++i))) + e.slice(i)).length, i -= i - n + c.length;
    }
  }
  return o.eval(e);
};

function cmd_highlight() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
    var range = sel.getRangeAt(0);
    var newNode = document.createElement("span");
    newNode.style.background = "yellow";
    range.surroundContents(newNode);
  }
}
cmd_highlight.description = 'Highlights your current selection, like <span style="background: yellow; color: black;">this</span>.';
cmd_highlight.icon = "chrome://ubiquity/skin/icons/textfield_rename.png";
cmd_highlight.preview = function(pblock) {
  pblock.innerHTML = cmd_highlight.description;
};

CmdUtils.CreateCommand({
  name : "link-to-wikipedia",
  takes : {"text" : noun_arb_text},
  icon: "http://www.wikipedia.org/favicon.ico",
  description: "Turns a selected phrase into a link to the matching Wikipedia article.",
  help: "Can only be used in a rich text-editing field.",
  execute : function( directObj ){
    var text = directObj.text;
    var wikiText = text.replace(/ /g, "_");
    var html = ("<a href=\"http://en.wikipedia.org/wiki/" +
                "Special:Search/" + wikiText +
                "\">" + text + "</a>");

    var doc = context.focusedWindow.document;
    if (doc.designMode == "on")
      doc.execCommand("insertHTML", false, html);
    else
      displayMessage("You're not in a rich text editing field.");
  },

  preview : function(pblock, directObj){
    var text = directObj.text;
    if (text.length < 1){
      pblock.innerHTML = "Inserts a link to Wikipedia article on text";
    }else{
      var wikiText = text.replace(/ /g, "_");
      var html = ("<a style=\"color: yellow;text-decoration: underline;\"" +
                  "href=\"http://en.wikipedia.org/wiki/" +
                  "Special:Search/" + wikiText +
                  "\">" + text + "</a>");
      pblock.innerHTML = "Inserts a link to Wikipedia article on " + text + " like this: " + html;
    }
  }
});

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

function translateTo( text, langCodePair, callback ) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";

  if( typeof(langCodePair.from) == "undefined" ) langCodePair.from = "";
  if( typeof(langCodePair.to) == "undefined" ) langCodePair.to = "";

  var params = Utils.paramsToString({
    v: "1.0",
    q: text,
    langpair: langCodePair.from + "|" + langCodePair.to
  });

  Utils.ajaxGet( url + params, function(jsonData){
    var data = Utils.decodeJson(jsonData);

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.

    try {
      var translatedText = data.responseData.translatedText;
    } catch(e) {

      // If we get either of these error messages, that means Google wasn't
      // able to guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_1 = "invalid translation language pair";
      var BAD_FROM_LANG_2 = "could not reliably detect source language";
      var errMsg = data.responseDetails;
      if( errMsg == BAD_FROM_LANG_1 || errMsg == BAD_FROM_LANG_2 ) {
        // Don't do infinite loops. If we already have a guess language
        // that matches the current forced from language, abort!
        if( langCodePair.from != "en" )
          translateTo( text, {from:"en", to:langCodePair.to}, callback );
        return;
      }
      else {
        displayMessage( "Translation Error: " + data.responseDetails );
      }
      return;
    }

    if( typeof callback == "function" )
      callback( translatedText );
    else
      CmdUtils.setSelection( translatedText );

    CmdUtils.setLastResult( translatedText );
  });
}

CmdUtils.CreateCommand({
  name: "translate",
  description: "Translates from one language to another.",
  icon: "http://www.google.com/favicon.ico",
  help: "You can specify the language to translate to, and the language to translate from.  For example," +
	" try issuing &quot;translate mother from english to chinese&quot;. If you leave out the the" +
	" languages, Ubiquity will try to guess what you want. It works on selected text in any web page, but" +
        " there's a limit to how much it can translate at once (a couple of paragraphs.)",
  takes: {"text to translate": noun_arb_text},
  modifiers: {to: noun_type_language, from: noun_type_language},

  execute: function( directObj, languages ) {
    // Default to translating to English if no to language
    // is specified.
    // TODO: Choose the default in a better way.

    var toLangCode = languages.to.data || "en";
    var fromLang = languages.from.data || "";

    translateTo( directObj.text, {to:toLangCode} );
  },

  preview: function( pblock, directObj, languages ) {
    var toLang = languages.to.text || "English";
    var toLangCode = languages.to.data || "en";
    var textToTranslate = directObj.text;

    var lang = toLang[0].toUpperCase() + toLang.substr(1);

    pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
      pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
      });
  }
});
