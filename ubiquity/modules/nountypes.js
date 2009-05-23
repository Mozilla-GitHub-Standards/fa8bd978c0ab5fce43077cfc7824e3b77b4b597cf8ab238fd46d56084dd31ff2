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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
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

Components.utils.import("resource://ubiquity/modules/cmdutils.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/setup.js");

var noun_arb_text = {
  _name: "text",
  rankLast: true,
  suggest: function(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.7, selectionIndices)];
  }
};

var noun_type_emailservice = {
  _name: "email service",
  suggest: function(text, html) {
    var providers = ["googleapps", "gmail", "yahoo"];
    var suggestions = [];
    //match based on input
    for each (var provider in providers) {
      if (provider.match(text, "i")){
        suggestions.push(CmdUtils.makeSugg(provider, null, provider));
      }
    }
    return suggestions;
  },
  'default': function() {
    //TODO: find a better way to pick the default
    return CmdUtils.makeSugg("gmail", null, "gmail", 0.9);
  }
};

/*
 * Noun that matches only emails based on the regexp
 * found on http://iamcal.com/publish/articles/php/parsing_email by Cal Henderson
 * This regexp is RFC822 compilant.
 */
var noun_type_email = {
  _name: "email",
  _regexp: new RegExp('^([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+' +
                      '|\\x22([^\\x0d\\x22\\x5c\\x80-\\xff]|\\x5c[\\x00-\\x7f])*\\x22)(\\x2e([^\\x00-\\x20\\x22' +
                      '\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+|\\x22([^\\x0d\\x22\\x5c' +
                      '\\x80-\\xff]|\\x5c\\x00-\\x7f)*\\x22))*\\x40([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-' +
                      '\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+|\\x5b([^\\x0d\\x5b-\\x5d\\x80-\\xff]|\\x5c[\\x00-' +
                      '\\x7f])*\\x5d)(\\x2e([^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\' +
                      'x5d\\x7f-\\xff]+|\\x5b([^\\x0d\\x5b-\\x5d\\x80-\\xff]|\\x5c[\\x00-\\x7f])*\\x5d))*$'),
  suggest: function(text, html){
    if(this._regexp.test(text)){
      return [ CmdUtils.makeSugg(text) ];
    }
    return [];
  }
};

var noun_type_percentage = {
  _name: "percentage",
  _default: CmdUtils.makeSugg("100%", null, 1.0),
  "default": function() this._default,
  suggest: function(text, html) {
    if (!text)
      return [];
    var number = parseFloat(text);
    if (isNaN(number))
      return [];
    if (number > 1 && text.indexOf(".") == -1)
      number /= 100;
    text = number*100 + "%";
    return [CmdUtils.makeSugg(text, null, number)];
  }
};

/*
 * Noun type for searching links on the awesomebar database.
 * Right now, the suggestion returned is:
 *  -- text: title of the url
 *  -- html: the link
 *  -- data: the favicon
 *
 *  The code is totally based on Julien Couvreur's insert-link command (http://blog.monstuff.com/archives/000343.html)
 */

var noun_type_awesomebar = {
  _name: "url",
  suggest: function(part, html, callback){
     Utils.history.search(part, CmdUtils.maxSuggestions, function(result){
       callback(CmdUtils.makeSugg(result.url, result.title, result.favicon));
     });
  }
};

var LanguageCodes = {
  'arabic' : 'ar',
  'bulgarian' : 'bg',
  'catalan' : 'ca',
  'chinese' : 'zh',
  'chinese_traditional' : 'zh-TW',
  'croatian': 'hr',
  'czech': 'cs',
  'danish' : 'da',
  'dutch': 'nl',
  'english' : 'en',
  // Filipino should be 'fil', however Google
  // improperly uses 'tl', which is actually
  // the language code for tagalog. Using 'tl'
  // for now so that filipino translations work.
  'filipino' : 'tl',
  'finnish' : 'fi',
  'french' : 'fr',
  'german' : 'de',
  'greek' : 'el',
  'hebrew' : 'he',
  'hindi' : 'hi',
  'hungarian' : 'hu',
  'indonesian' : 'id',
  'italian' : 'it',
  'japanese' : 'ja',
  'korean' : 'ko',
  'latvian' : 'lv',
  'lithuanian' : 'lt',
  'norwegian' : 'no',
  'polish' : 'pl',
  'portuguese' : 'pt',
  'romanian' : 'ro',
  'russian' : 'ru',
  'serbian' : 'sr',
  'slovak' : 'sk',
  'slovenian' : 'sl',
  'spanish' : 'es',
  'swedish' : 'sv',
  'ukranian' : 'uk',
  'vietnamese' : 'vi',
  'simple english' : 'simple'
};

var noun_type_language =  {
  _name: "language",

  suggest: function( text, html ) {
    var suggestions = [];
    for ( var word in LanguageCodes ) {
      // Do the match in a non-case sensitive way
      if ( word.indexOf( text.toLowerCase() ) > -1 ) {
        // Use the 2-letter language code as the .data field of the suggestion
        var sugg = CmdUtils.makeSugg(word, word, LanguageCodes[word]);
      	suggestions.push( sugg );
      }
    }
    return suggestions;
  },

  // Returns the language name for the given lang code.
  getLangName: function(langCode) {
    var code = langCode.toLowerCase();
    for (var word in LanguageCodes)
      if (code === LanguageCodes[word])
        return word;
    return null;
  }
};

var noun_type_tab = {
  _name: "tab name",
  suggest: function(text, html, cb, selectedIndices)(
    [CmdUtils.makeSugg(tab.document.title || tab.document.URL,
                        null, tab, selectedIndices)
     for each (tab in Utils.tabs.search(text, CmdUtils.maxSuggestions))]),
};

var noun_type_searchengine = {
  _name: "search engine",
  suggest: function(fragment, html) {
    var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
      .getService(Components.interfaces.nsIBrowserSearchService);
    var engines = searchService.getVisibleEngines({});

    if (!fragment) {
      return engines.map(function(engine) {
        return CmdUtils.makeSugg(engine.name, null, engine);
      });
    }

    var fragment = fragment.toLowerCase();
    var suggestions = [];

    for(var i = 0; i < engines.length; i++) {
      if(engines[i].name.toLowerCase().indexOf(fragment) > -1) {
        suggestions.push(CmdUtils.makeSugg(engines[i].name, null, engines[i], 0.9));
      }
    }

    return suggestions;
  },
  getDefault: function() {
    return (Components.classes["@mozilla.org/browser/search-service;1"]
            .getService(Components.interfaces.nsIBrowserSearchService)
            .defaultEngine);
  }
};

var noun_type_tag = {
  _name: "tag-list",
  suggest: function(fragment) {
    var allTags = (Components.classes["@mozilla.org/browser/tagging-service;1"]
                   .getService(Components.interfaces.nsITaggingService)
                   .allTags);

    if(fragment.length < 1) {
      return allTags.map(function(tag) {
        return CmdUtils.makeSugg(tag, null, [tag]);
      });
    }

    fragment = fragment.toLowerCase();
    var numTags = allTags.length;
    var suggestions = [];

    // can accept multiple tags, seperated by a comma
    // assume last tag is still being typed - suggest completions for that

    var completedTags = fragment.split(",").map(function(tag) {
      return Utils.trim(tag);
    });;


    // separate last tag in fragment, from the rest
    var uncompletedTag = completedTags.pop();

    completedTags = completedTags.filter(function(tagName) {
      return tagName.length > 0;
    });
    var fragmentTags = "";
    if(completedTags.length > 0)
      fragmentTags = completedTags.join(",");

    if(uncompletedTag.length > 0) {
      if(fragmentTags.length > 0) {
        suggestions.push(CmdUtils.makeSugg(
          fragmentTags + "," + uncompletedTag,
          null,
          completedTags.concat([uncompletedTag])
         ));
       } else {
         suggestions.push(CmdUtils.makeSugg(
                             uncompletedTag,
                             null,
                             completedTags
                          ));
       }

    } else {
      suggestions.push(CmdUtils.makeSugg(
                         fragmentTags,
                         null,
                         completedTags
                       ));
    }

    for(var i = 0; i < numTags; i++) {
      // handle cases where user has/hasn't typed anything for the current uncompleted tag in the fragment
      // and only match from the begining of a tag name (not the middle)
      if(uncompletedTag.length < 1 || allTags[i].indexOf(uncompletedTag) == 0) {
        // only if its not in the list already
        if(completedTags.indexOf(allTags[i]) == -1)
          suggestions.push(CmdUtils.makeSugg(
                             fragmentTags + "," + allTags[i],
                             null,
                             completedTags.concat([allTags[i]])
         ));
      }
    }

    return suggestions;
  }
};

var noun_type_url = {
  /* TODO longterm, noun_type_url could suggest URLs you've visited before, by querying
   * the awesomebar's data source
   */
  _name : "url",
  rankLast: true,
  suggest: function(fragment) {
    var regexp = /^[A-Za-z][A-Za-z\d.+-]:\/\/(?:\w+:?\w*@)?(\S+)(?::\d+)?\/?/;
    // Magic words "page" or "url" result in the URL of the current page
    if (fragment == "page" || fragment == "url") {
      var url = Application.activeWindow.activeTab.document.URL;
      return [CmdUtils.makeSugg(url)];
    }
    // If it's a valid URL, suggest it back
    if (regexp.test(fragment)) {
      return [CmdUtils.makeSugg(fragment)];
    } else if (regexp.test( "http://" + fragment ) ) {
      return [CmdUtils.makeSugg("http://" + fragment)];
    }
    return [];
  }
};

var noun_type_livemark = {
  _name: "livemark",
  rankLast: true,

  /*
  * text & html = Livemark Title (string)
  * data = { itemIds : [] } - an array of itemIds(long long)
  * for the suggested livemarks.
  * These values can be used to reference the livemark in bookmarks & livemark
  * services
  */

  getFeeds: function() {

    //Find all bookmarks with livemark annotation
     return Components.classes["@mozilla.org/browser/annotation-service;1"]
        .getService(Components.interfaces.nsIAnnotationService)
        .getItemsWithAnnotation("livemark/feedURI", {});
  },

  'default': function() {
    var feeds = this.getFeeds();
    if( feeds.length > 0 ) {
       return CmdUtils.makeSugg("all livemarks", null, {itemIds: feeds});
    }
    return null;
  },

  suggest: function(fragment) {
    fragment = fragment.toLowerCase();

    var suggestions = [];
    var allFeeds = this.getFeeds();

    if(allFeeds.length > 0) {
      var bookmarks = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                                  .getService(Components.interfaces.nsINavBookmarksService);

      for(var i = 0; i < allFeeds.length; ++i) {
        var livemarkTitle = bookmarks.getItemTitle(allFeeds[i]).toLowerCase();
        if(livemarkTitle.toLowerCase().indexOf(fragment) > -1) {
          suggestions.push(CmdUtils.makeSugg(livemarkTitle , null,
                                         { itemIds: [allFeeds[i]] } )); //data.itemIds[]
        }
      }

      //option for all livemarks
      var all = "all livemarks";
      if(all.indexOf(fragment) > -1) {
        suggestions.push(CmdUtils.makeSugg( all , null, {itemIds: allFeeds} ));
      }
      return suggestions;
    }
    return [];
  }
};

var noun_type_commands = {
   _name: "command",
   __cmdSource : UbiquitySetup.createServices().commandSource,

   suggest : function(fragment){
      var cmds = [];
      for each( var cmd in this.__cmdSource.commandNames){
         if(cmd.name.match(fragment, "i")){
            var cmdObj = this.__cmdSource.getCommand(cmd.name);

            var help = cmdObj.help ? cmdObj.help : cmdObj.description;
            cmds.push(CmdUtils.makeSugg(cmd.name, help, cmdObj));
         }
      }
      return cmds;
   }
}

var noun_type_twitter_user = {
   _name: "twitter username",
   rankLast: true,
   suggest: function(text, html, cb, selected){
     if(selected) return [];
     
     // Twitter usernames can't contain spaces; reject input with spaces.
     if (text.length && text.indexOf(" ") != -1)
       return [];

     var suggs = [];

     // If we don't need to ask the user for their master password, let's
     // see if we can suggest known users that the user has logged-in as
     // before.
     var tokenDB = Cc["@mozilla.org/security/pk11tokendb;1"].
                   getService(Ci.nsIPK11TokenDB);
     var token = tokenDB.getInternalKeyToken();

     if (!token.needsLogin() || token.isLoggedIn()) {
       // Look for twitter usernames stored in password manager
       var usersFound = {};
       var passwordManager = Cc["@mozilla.org/login-manager;1"]
                             .getService(Ci.nsILoginManager);
       var urls = ["https://twitter.com", "http://twitter.com"];
       urls.forEach(
         function(url) {
           var logins = passwordManager.findLogins({}, url, "", "");

           for (var x = 0; x < logins.length; x++) {
             var login = logins[x];
             if (login.username.indexOf(text) != -1 &&
                 !usersFound[login.username]) {
               usersFound[login.username] = true;
               suggs.push(CmdUtils.makeSugg(login.username, null, login));
             }
           }
         });
     }

     // If all else fails, treat the user's single-word input as a twitter
     // username.
     if (suggs.length == 0)
       suggs.push(CmdUtils.makeSugg(text, null, null, 0.7));

     return suggs;
   }
};

var noun_type_number = {
  _name: "number",
  suggest: function(text) {
    return /^\d+$/.test(text) ? [CmdUtils.makeSugg(text, null, +text)] : [];
  },
  "default": function() {
    return CmdUtils.makeSugg("1", null, 1, 0.9);
  }
};

var noun_type_bookmarklet = {
  _name: "bookmarklet",
  suggest: function(txt, htm, cb, selected) {
    if (selected || !txt) return [];
    try { var tester = RegExp(txt, "i") }
    catch (e) {
      txt = txt.toLowerCase();
      tester = {test: function(x) ~x.toLowerCase().indexOf(txt)};
    }
    return [s for each (s in this.list) if(tester.test(s.text))];
  },
  list: null,
  load: function(reload) {
    var jsm = {};
    Components.utils.import("resource://gre/modules/utils.js", jsm);
    var list = [];
    var {bookmarks, history} = jsm.PlacesUtils;
    var query = history.getNewQuery();
    var options = history.getNewQueryOptions();
    query.onlyBookmarked = true;
    query.searchTerms = "javascript:";
    options.queryType = options.QUERY_TYPE_BOOKMARKS;
    options.sortingMode = options.SORT_BY_TITLE_DESCENDING;
    var {root} = history.executeQuery(query, options);
    root.containerOpen = true;
    for (var i = root.childCount; i--;) {
      var node = root.getChild(i);
      if(/^javascript:/.test(node.uri) &&
         !bookmarks.getKeywordForBookmark(node.itemId))
        list.push(CmdUtils.makeSugg(node.title, null, node.uri));
    }
    root.containerOpen = false;
    this.list = list;
    return this;
  }
}.load();

var EXPORTED_SYMBOLS = [sym for (sym in this) if (/^noun_/.test(sym))];