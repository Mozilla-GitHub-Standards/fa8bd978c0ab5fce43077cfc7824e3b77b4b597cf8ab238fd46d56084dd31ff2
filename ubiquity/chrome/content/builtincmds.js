CmdUtils.CreateCommand({
  name:"map-these",
  takes: {"selection": noun_arb_text },
  preview: function( pblock, directObject ) {
    var html = directObject.html;
    pblock.innerHTML = "<span id='loading'>Mapping...</span>";

    // TODO: Figure out why we have to do this?
    var doc = context.focusedWindow.document;
    var div = doc.createElement( "div" );
    div.innerHTML = html;

    var pages = {};

    jQuery( "a", div ).each( function() {
      if( this.href.indexOf(".html") != -1 ) {
        pages[ jQuery(this).text() ] = this.href;
        displayMessage( this.href );
      }
    });

    var mapUrl = "http://maps.google.com/staticmap?";

    var params = {
      size: "500x300",
      key: "ABQIAAAAGZ11mh1LzgQ8-8LRW3wEShQeSuJunOpTb3RsLsk00-MAdzxmXhQoiCd940lo0KlfQM5PeNYEPLW-3w",
      markers: ""
    };

    var mapURL = mapUrl + jQuery.param( params );
    var img = doc.createElement( "img" );
    img.src = mapURL;
    jQuery(pblock).height( 300 )
                  .append( img )
                  .append( "<div id='spots'></div>");

    var markerNumber = 97; // Lowercase a

    for( var description in pages ) {
      jQuery.get( pages[description], function(pageHtml) {
        var div = doc.createElement( "div" );
        div.innerHTML = pageHtml;

        // Get the link entitled "Google Map" and then strip out
        // the location from it's href, which is always of the form
        // http://map.google.com?q=loc%3A+[location], where [location]
        // is the location string with spaces replaced by pluses.
        var mapLink = jQuery( "a:contains(google map)", div );
        if( mapLink.length > 0 ) {
          mapLink = mapLink[0];
          var loc = mapLink.href.match( /\?q=loc%3A\+(.*)/ )[1]
                                .replace( /\+/g, " ");
          displayMessage( loc );
          CmdUtils.geocodeAddress( loc, function(points){
            if( points != null){
              jQuery( "#loading:visible", pblock).slideUp();

              var params = {
                lat: points[0].lat,
                long: points[0].long,
                marker: String.fromCharCode( markerNumber++ ),
                name: description
              }

              img.src += CmdUtils.renderTemplate( "${lat},${long},red${marker}|", params );

              params.marker = params.marker.toUpperCase();
              var spotName = CmdUtils.renderTemplate( "<div><b>${marker}</b>: <i>${name}</i></div>", params );
              jQuery( "#spots", pblock ).append( spotName );
              jQuery( pblock ).animate( {height: "+=10px"} );
            }
          });
        }
      });
    }

  }
})

// -----------------------------------------------------------------
// SEARCH COMMANDS
// -----------------------------------------------------------------

function makeSearchCommand( options ) {
  options.execute = function(directObject, modifiers) {
    var query = directObject.text;
    var urlString = options.url.replace("{QUERY}", query);
    Utils.openUrlInBrowser(urlString);
    CmdUtils.setLastResult( urlString );
  };

  options.takes = {"search term": noun_arb_text};

  if (! options.preview )
    options.preview = function(pblock, directObject, modifiers) {
      var query = directObject.text;
      var content = ("Performs a " + options.name + " search for <b>" +
		     query + "</b>.");
      pblock.innerHTML = content;
    };

  options.name = options.name.toLowerCase();

  CmdUtils.CreateCommand(options);
}


makeSearchCommand({
  name: "Google",
  url: "http://www.google.com/search?q={QUERY}",
  icon: "http://www.google.com/favicon.ico",
  preview: function(pblock, directObject) {
    var searchTerm = directObject.text;
    var url = "http://ajax.googleapis.com/ajax/services/search/web";
    var params = { v: "1.0", q: searchTerm };

    jQuery.get( url, params, function(data) {
      var numToDisplay = 3;
      var results = data.responseData.results.splice( 0, numToDisplay );

      pblock.innerHTML = CmdUtils.renderTemplate( null,
						  {results:results},
						  {file:"searchresults.html"}
						);
      }, "json");
  }
});

makeSearchCommand({
  name: "Wikipedia",
  url: "http://en.wikipedia.org/wiki/Special:Search?search={QUERY}",
  icon: "http://en.wikipedia.org/favicon.ico",
  locale: "en-US",
  homepage: "http://theunfocused.net/moz/ubiquity/verbs/",
  author: {name: "Blair McBride", email: "blair@theunfocused.net"},
  license: "MPL",
  preview: function(previewBlock, directObject) {
    var apiUrl = "http://en.wikipedia.org/w/api.php";

    var searchText = jQuery.trim(directObject.text);
    if(searchText.length < 1) {
      previewBlock.innerHTML = "Searches Wikipedia";
      return;
    }

    var previewTemplate = "Searching Wikipedia for <b>${query}</b> ...";
    var previewData = {query: searchText};
    previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    var apiParams = {
      format: "json",
      action: "query",
      list: "search",
      srlimit: 10,
      srwhat: "text",
      srsearch: searchText
    };

    jQuery.ajax({
      type: "GET",
      url: apiUrl,
      data: apiParams,
      datatype: "string",
      error: function() {
	previewBlock.innerHTML = "Error searching Wikipedia";
      },
      success: function(searchReponse) {
        searchReponse = Utils.decodeJson(searchReponse);

        if(!("query" in searchReponse && "search" in searchReponse.query)) {
	  previewBlock.innerHTML = "Error searching Wikipedia";
	  return;
	}

	function generateWikipediaLink(title) {
          var wikipediaUrl = "http://en.wikipedia.org/wiki/";
          return wikipediaUrl + title.replace(/ /g, "_");
        }

        var previewTemplate = "Wikipedia articles found matching <b>${query}</b>:<br /><br />" +
                              "{for article in results}" +
                              "<a href=\"${article.title|wikilink}\">${article.title}</a><br />" +
                              "{forelse}" +
                              "<b>No articles found</b>" +
                              "{/for}";

        previewData = {
          query: searchText,
          results: searchReponse.query.search,
          _MODIFIERS: {wikilink: generateWikipediaLink}
        };

        previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);
      }
    });
  }
});

// TODO: This should be added to Utils.openUrlInBrowser()
// function openUrl(url, postData) {
//  var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"]
//    .getService(Components.interfaces.nsIWindowMediator);
//  var browserWindow = windowManager.getMostRecentWindow("navigator:browser");
//  var browser = browserWindow.getBrowser();
//
//  if(browser.mCurrentBrowser.currentURI.spec == "about:blank")
//    browserWindow.loadURI(url, null, postData, false);
//  else
//    browser.loadOneTab(url, null, null, postData, false, false);
// }

makeSearchCommand({
  name: "IMDB",
  url: "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
  icon: "http://i.imdb.com/favicon.ico"
});

makeSearchCommand({
  name: "YouTube",
  url: "http://www.youtube.com/results?search_type=search_videos&search_sort=relevance&search_query={QUERY}&search=Search",
  icon: "http://www.youtube.com/favicon.ico"
});

makeSearchCommand({
  name: "Flickr",
  url: "http://www.flickr.com/search/?q={QUERY}&w=all",
  icon: "http://www.flickr.com/favicon.ico"
});

makeSearchCommand({
  name: "Bugzilla",
  url: "https://bugzilla.mozilla.org/buglist.cgi?query_format=specific&order=relevance+desc&bug_status=__open__&content={QUERY}",
  icon: "http://www.mozilla.org/favicon.ico"
});

CmdUtils.CreateCommand({
  name: "yelp",
  takes: { "restaurant":noun_arb_text },
  // TODO: Should be noun_type_address, which is currently broken.
  // See http://labs.toolness.com/trac/ticket/44
  modifiers: { near:noun_arb_text },
  icon: "http://www.yelp.com/favicon.ico",

  execute: function( directObject, info ) {
    var query = directObject.text;
    var url = "http://www.yelp.com/search?find_desc={QUERY}&find_loc={NEAR}";
    url = url.replace( /{QUERY}/g, query);
    url = url.replace( /{NEAR}/g, info.near.text);

    Utils.openUrlInBrowser( url );
  },

  preview: function( pblock, directObject, info ) {
    var query = directObject.text;
    var url = "http://api.yelp.com/business_review_search?";

    if( query.length == 0 ) return;

    var loc = CmdUtils.getLocation();
    var near = info.near.text || (loc.city + ", " + loc.state);

    var params = {
      term: query,
      num_biz_requested: 4,
      location: near,
      ywsid: "HbSZ2zXYuMnu1VTImlyA9A"
    };

    jQuery.get( url, params, function(data) {
      pblock.innerHTML = CmdUtils.renderTemplate( null,
                                          {businesses: data.businesses},
                                          {file:"yelp.html"});
		}, "json");
  }
})



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

function cmd_italic() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("italic", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_underline() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("underline", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_undo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("undo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}

function cmd_redo() {
  var doc = context.focusedWindow.document;

  if (doc.designMode == "on")
    doc.execCommand("redo", false, null);
  else
    displayMessage("You're not in a rich text editing field.");
}


CmdUtils.CreateCommand({
  name: "calculate",
  takes: {"expression": noun_arb_text},
  icon: "http://www.metacalc.com/favicon.ico",
  execute: function( directObj ) {
    var expr = directObj.text;
    if( expr.length > 0 ) {
      var result = eval( expr );
      CmdUtils.setSelection( result );
      CmdUtils.setLastResult( result );
    } else
      displayMessage( "Requires an expression.");
  },
  preview: function( pblock, directObj ) {
    var expr = directObj.text;
    if( expr.length < 1 ){
      pblock.innerHTML = "Calculates an expression. E.g., 22/7.";
      return;
    }

    pblock.innerHTML = expr + " = ";
    try{ pblock.innerHTML += eval( expr ); }
    catch(e) { pblock.innerHTML += "?"; }
  }
});


function defineWord(word, callback) {
  var url = "http://services.aonaware.com/DictService/DictService.asmx/DefineInDict";
  var params = Utils.paramsToString({
    dictId: "wn", //wn: WordNet, gcide: Collaborative Dictionary
    word: word
  });

  Utils.ajaxGet(url + params, function(xml) {
    CmdUtils.loadJQuery( function() {
      var $ = window.jQuery;
      var text = $(xml).find("WordDefinition").text();
      callback(text);
    });
  });
}

CmdUtils.CreateCommand({
  name: "define",
  takes: {"word": noun_arb_text},
  execute: function( directObj ) {
    var word = directObj.text;
    Utils.openUrlInBrowser( "http://www.answers.com/" + escape(word) );
  },
  preview: function( pblock, directObj ) {
    var word = directObj.text;
    if (word.length < 2)
      pblock.innerHTML = "Gives the definition of a word.";
    else
      pblock.innerHTML = "Gives the definition of the word " + word + ".";
    defineWord( word, function(text){
      text = text.replace(/(\d+:)/g, "<br/><b>$&</b>");
      text = text.replace(/(1:)/g, "<br/>$&");
      text = text.replace(word, "<span style='font-size:18px;'>$&</span>");
      text = text.replace(/\[.*?\]/g, "");

      pblock.innerHTML = text;
    });
  }
})

// TODO: Add the ability to manually set the language being highlighted.
// TODO: Add the ability to select the style of code highlighting.
CmdUtils.CreateCommand({
  name: "syntax-highlight",
  takes: {"code": noun_arb_text},
  execute: function( directObj ) {
    var code = directObj.text;
    var url = "http://azarask.in/services/syntaxhighlight/color.py";
    var params = {
      code: code,
      style: "native"
    };

    jQuery.post( url, params, function( html ) {
      html = html.replace( /class="highlight"/, "style='background-color:#222;padding:3px'");
      CmdUtils.setSelection( html );
    });
  },
  preview: "Syntax highlights your code."
})


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

cmd_highlight.preview = function(pblock) {
  pblock.innerHTML = 'Highlights your current selection, like <span style="background: yellow; color: black;">this</span>.';
}

CmdUtils.CreateCommand({
  name : "link-to-wikipedia",
  takes : {"text" : noun_arb_text},
  icon: "http://www.wikipedia.org/favicon.ico",

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
})

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

var Languages = {
  'ARABIC' : 'ar',
  'CHINESE' : 'zh',
  'CHINESE_TRADITIONAL' : 'zh-TW',
  'DANISH' : 'da',
  'DUTCH': 'nl',
  'ENGLISH' : 'en',
  'FINNISH' : 'fi',
  'FRENCH' : 'fr',
  'GERMAN' : 'de',
  'GREEK' : 'el',
  'HINDI' : 'hi',
  'ITALIAN' : 'it',
  'JAPANESE' : 'ja',
  'KOREAN' : 'ko',
  'NORWEGIAN' : 'no',
  'POLISH' : 'pl',
  'PORTUGUESE' : 'pt-PT',
  'ROMANIAN' : 'ro',
  'RUSSIAN' : 'ru',
  'SPANISH' : 'es',
  'SWEDISH' : 'sv'
};

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
    var data = eval( '(' + jsonData + ')' );

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.

    try {
      var translatedText = data.responseData.translatedText;
    } catch(e) {

      // If we get this error message, that means Google wasn't able to
      // guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_GUESS_MSG = "invalid translation language pair";
      if( data.responseDetails == BAD_FROM_LANG_GUESS_MSG ){
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
  takes: {"text to translate": noun_arb_text},
  modifiers: {to: noun_type_language, from: noun_type_language},

  execute: function( directObj, languages ) {
    // Default to translating to English if no to language
    // is specified.
    // TODO: Choose the default in a better way.

    var toLang = languages.to.text || "English";
    var fromLang = languages.from.text || "";
    var toLangCode = Languages[toLang.toUpperCase()];

    translateTo( directObj.text, {to:toLangCode} );
  },

  preview: function( pblock, directObj, languages ) {
    var toLang = languages.to.text || "English";
    var textToTranslate = directObj.text;

    var toLangCode = Languages[toLang.toUpperCase()];
    var lang = toLang[0].toUpperCase() + toLang.substr(1);

    pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
    translateTo( textToTranslate, {to:toLangCode}, function( translation ) {
      pblock.innerHTML = "Replaces the selected text with the " + lang + " translation:<br/>";
      pblock.innerHTML += "<i style='padding:10px;color: #CCC;display:block;'>" + translation + "</i>";
      });
  }
})


// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "help",
  preview: "Provides help on using Ubiquity, as well as access to preferences, etc.",
  execute: function(){
    Utils.openUrlInBrowser("about:ubiquity");
  }
});

CmdUtils.CreateCommand({
  name: "command-editor",
  preview: "Opens the editor for writing Ubiquity commands",
  execute: function(){
    Utils.openUrlInBrowser("chrome://ubiquity/content/editor.html");
  }
});

CmdUtils.CreateCommand({
  name: "remember",
  takes: {"thing": noun_arb_text},
  execute: function( thing, modifiers ) {
    displayMessage( "I am remembering " + thing.text );
    CmdUtils.setLastResult( thing );
  }
});

// -----------------------------------------------------------------
// EMAIL COMMANDS
// -----------------------------------------------------------------

function findGmailTab() {
  var window = Application.activeWindow;

  var gmailURL = "://mail.google.com";
  var currentLocation = String(Application.activeWindow.activeTab.document.location);
  if(currentLocation.indexOf(gmailURL) != -1) {
    return Application.activeWindow.activeTab;
  }

  for (var i = 0; i < window.tabs.length; i++) {
    var tab = window.tabs[i];
    var location = String(tab.document.location);
    if (location.indexOf(gmailURL) != -1) {
      return tab;
    }
  }
  return null;
}

CmdUtils.CreateCommand({
  name: "email",
  takes: {"message": noun_arb_text},
  modifiers: {to: noun_type_contact},

  preview: function(pblock, directObj, modifiers) {
    var html = "Creates an email message ";
    if (modifiers.to) {
      html += "to " + modifiers.to.text;
    }
    if (directObj.html) {
      html += "with these contents:" + directObj.html;
    } else {
      html += "with a link to the current page.";
    }
    pblock.innerHTML = html;
  },

  execute: function(directObj, headers) {
    var html = directObj.html;
    var document = context.focusedWindow.document;
    var title;
    if (document.title)
      title = document.title;
    else
      title = html;
    var location = document.location;
    var gmailTab = findGmailTab();
    var pageLink = "<a href=\"" + location + "\">" + title + "</a>";
    if (html) {
      html = ("<p>From the page " + pageLink + ":</p>" + html);
    } else {
      // If there's no selection, just send the current page.
      html = "<p>You might be interested in " + pageLink + ".</p>";
    }

    title = "'" + title + "'";

    if (gmailTab) {
      // Note that this is technically insecure because we're
      // accessing wrappedJSObject, but we're only executing this
      // in a Gmail tab, and Gmail is trusted code.
      var console = gmailTab.document.defaultView.wrappedJSObject.console;
      var gmonkey = gmailTab.document.defaultView.wrappedJSObject.gmonkey;

      var continuer = function() {
        // For some reason continuer.apply() won't work--we get
        // a security violation on Function.__parent__--so we'll
        // manually safety-wrap this.
	try {
          var gmail = gmonkey.get("1.0");
          var sidebar = gmail.getNavPaneElement();
          var composeMail = sidebar.getElementsByTagName("span")[0];
	  //var composeMail = sidebar.getElementById(":qw");
          var event = composeMail.ownerDocument.createEvent("Events");
          event.initEvent("click", true, false);
          composeMail.dispatchEvent(event);
          var active = gmail.getActiveViewElement();
	  var to = composeMail.ownerDocument.getElementsByName("to")[0];
	  if (to && headers.to) to.value = headers.to.text;
          var subject = active.getElementsByTagName("input")[0];
          if (subject) subject.value = title;
          var iframe = active.getElementsByTagName("iframe")[0];
          if (iframe)
            iframe.contentDocument.execCommand("insertHTML", false, html);
          else {
            var body = composeMail.ownerDocument.getElementsByName("body")[0];
            html = ("Note: the following probably looks strange because " +
                    "you don't have rich formatting enabled.  Please " +
                    "click the 'Rich formatting' link above, discard " +
                    "this message, and try " +
                    "the email command again.\n\n" + html);
            body.value = html;
          }
          gmailTab.focus();
        } catch (e) {
          displayMessage({text: "A gmonkey exception occurred.",
                          exception: e});
        }
      };

      gmonkey.load("1.0", continuer);
    } else {
      // No gmail tab open?  Open a new one:
      var params = {fs:1, tf:1, view:"cm", su:title, to:headers.to, body:html};
      Utils.openUrlInBrowser("http://mail.google.com/mail/?" +
			     Utils.paramsToString(params));
    }
  }
});


// -----------------------------------------------------------------
// CALENDAR COMMANDS
// -----------------------------------------------------------------


function addToGoogleCalendar(eventString) {
  var secid = Utils.getCookie("www.google.com", "secid");

  var URLS = {
    parse: "http://www.google.com/calendar/compose",
    create: "http://www.google.com/calendar/event"
  };

  function parseGoogleJson(json) {
    var securityPreface = "while(1)";
    var splitString = json.split( ";", 2 );
    if ( splitString[0] != securityPreface ) {
      displayMessage( "Unexpected Return Value" );
      return null;
    }
    // TODO: Security hull breach!
    return eval( splitString[1] )[0];
  }

  var params = Utils.paramsToString({
    "ctext": eventString,
    "qa-src": "QUICK_ADD_BOX"
  });

  Utils.ajaxGet(URLS["parse"]+params, function(json) {
    var data = parseGoogleJson( json );
    var eventText = data[1];
    var eventStart = data[4];
    var eventEnd = data[5];
    var secid = Utils.getCookie("www.google.com", "secid");

    var params = Utils.paramsToString({
      "dates": eventStart + "/" + eventEnd,
      "text": eventText,
      "secid": secid,
      "action": "CREATE",
      "output": "js"
    });

    Utils.ajaxGet(URLS["create"] + params, function(json) {
      // TODO: Should verify this, and print appropriate positive
      // understand feedback. Like "blah at such a time was created.
      displayMessage("Event created.");

      // TODO: Should iterate through open tabs and cause any open
      // Google Calendar tabs to refresh.
    });
  });
}

/* TODO this comman just takes unstructured text right now and relies on
 google calendar to figure it out.  So we're not using the DateNounType
 here.  Should we be?  And, is there a better name for this command? */
CmdUtils.CreateCommand({
  name: "add-to-calendar",
  takes: {"event": noun_arb_text}, // TODO: use DateNounType or EventNounType?
  preview: "Adds the event to Google Calendar.",
  execute: function( eventString ) {
    addToGoogleCalendar( eventString );
  }
})



// TODO: Don't do a whole-sale copy of the page ;)
function checkCalendar(pblock, date) {
  var url = "http://www.google.com/calendar/m";
  var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

  Utils.ajaxGet(url + params, function(html) {
    pblock.innerHTML = html;
  });
}

CmdUtils.CreateCommand({
  name: "check-calendar",
  takes: {"date to check": noun_type_date},
  execute: function( directObj ) {
    var date = directObj.data;
    var url = "http://www.google.com/calendar/m";
    var params = Utils.paramsToString({ as_sdt: date.toString("yyyyMMdd") });

    Utils.openUrlInBrowser( url + params );
  },
  preview: function( pblock, directObj ) {
    var date = directObj.data;
    pblock.innerHTML = "Checks Google Calendar for the day of" +
  		       date.toString("dd MM, yyyy");
  	checkCalendar( pblock, date );
  }
});


// -----------------------------------------------------------------
// WEATHER COMMANDS
// -----------------------------------------------------------------


var WEATHER_TYPES = "none|tropical storm|hurricane|severe thunderstorms|thunderstorms|mixed rain and snow|mixed rain and sleet|mixed snow and sleet|freezing drizzle|drizzle|freezing rain|rain|rain|snow flurries|light snow showers|blowing snow|snow|hail|sleet|dust|foggy|haze|smoky|blustery|windy|cold|cloudy|mostly cloudy|mostly cloudy|partly cloudy|partly cloudy|clear|sunny|fair|fair|mixed rain and hail|hot|isolated thunderstorms|scattered thunderstorms|scattered thunderstorms|scattered showers|heavy snow|scattered snow showers|heavy snow|partly cloudy|thundershowers|snow showers|isolated thundershowers".split("|");

CmdUtils.CreateCommand({
  name: "weather",
  takes: {"location": noun_arb_text},

  execute: function( directObj ) {
    var location = directObj.text;
    var url = "http://www.wunderground.com/cgi-bin/findweather/getForecast?query=";
    url += escape( location );

    Utils.openUrlInBrowser( url );
  },

  preview: function( pblock, directObj ) {
    var location = directObj.text;
    if( location.length < 1 ) {
      pblock.innerHTML = "Gets the weather for a zip code/city.";
      return;
    }

    var url = "http://www.google.com/ig/api";
    jQuery.get( url, {weather: location}, function(xml) {
      var el = jQuery(xml).find("current_conditions");
      if( el.length == 0 ) return;

      var condition = el.find("condition").attr("data");

      var weatherId = WEATHER_TYPES.indexOf( condition.toLowerCase() );
      var imgSrc = "http://l.yimg.com/us.yimg.com/i/us/nws/weather/gr/";
      imgSrc += weatherId + "d.png";

      var weather = {
        condition: condition,
        temp: el.find("temp_f").attr("data"),
        humidity: el.find("humidity").attr("data"),
        wind: el.find("wind_condition").attr("data"),
        img: imgSrc
      };

      weather["img"] = imgSrc;

      var html = CmdUtils.renderTemplate( null, {w:weather},
                                                {file:"weather.html"}
                                        );

      jQuery(pblock).html( html );
      }, "xml");
  }
});


// -----------------------------------------------------------------
// MAPPING COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "map",
  takes: {"address": noun_arb_text},
  execute: function( directObj ) {
    var location = directObj.text;
    var url = "http://maps.google.com/?q=";
    url += encodeURIComponent(location);

    Utils.openUrlInBrowser( url );
  },
  preview: function(pblock, directObj) {
    var location = directObj.text;
    CmdUtils.showPreviewFromFile( pblock,
                                  "templates/map.html",
                                  function(winInsecure) {
      winInsecure.setPreview( location );

      winInsecure.insertHtml = function(html) {
        var doc = context.focusedWindow.document;
        var focused = context.focusedElement;

        // This would be nice to store the map in the buffer...
	// But for now, it causes a problem with a large image showing up as the default
        //CmdUtils.setLastResult( html );

        if (doc.designMode == "on") {
          doc.execCommand("insertHTML", false, html);
        }
        else if (CmdUtils.getSelection()) {
	  CmdUtils.setSelection(html);
	}
	else {
	  displayMessage("Cannot insert in a non-editable space. Use 'edit page' for an editable page.");
	}
      };
    });
  }
});

// -----------------------------------------------------------------
// MISC COMMANDS
// -----------------------------------------------------------------

function cmd_view_source() {
  var url = Application.activeWindow.activeTab.document.location.href;
  url = "view-source:" + url;
  // TODO: Should do it this way:
  // Utils.openUrlInBrowser( "http://www.google.com" );
  CmdUtils.getWindowInsecure().location = url;
}

/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.


*/

// max of 140 chars is recommended, but it really allows 160
const TWITTER_STATUS_MAXLEN = 160;


CmdUtils.CreateCommand({
  name: "twitter",
  icon: "http://assets3.twitter.com/images/favicon.ico",
  takes: {status: noun_arb_text},
  modifiers: {},
  preview: function(previewBlock, directObj) {
    var statusText = directObj.text;
    var previewTemplate = "Updates your Twitter status to: <br /><b>${status}</b><br /><br />Characters remaining: <b>${chars}</b>";
    var truncateTemplate = "<br />The last <b>${truncate}</b> characters will be truncated!";
    var previewData = {
      status: statusText,
      chars: TWITTER_STATUS_MAXLEN - statusText.length
    };

    var previewHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    if(previewData.chars < 0) {
      var truncateData = {
        truncate: 0 - previewData.chars
      };

      previewHTML += CmdUtils.renderTemplate(truncateTemplate, truncateData);
    }

    previewBlock.innerHTML = previewHTML;
  },
  execute: function(directObj) {
    var statusText = directObj.text;
    if(statusText.length < 1) {
      displayMessage("Twitter requires a status to be entered");
      return;
    }

    var updateUrl = "https://twitter.com/statuses/update.json";
    var updateParams = {
      source: "ubiquity",
      status: statusText
    };

    jQuery.ajax({
      type: "POST",
      url: updateUrl,
      data: updateParams,
      dataType: "json",
      error: function() {
        displayMessage("Twitter error - status not updated");
      },
      success: function() {
        displayMessage("Twitter status updated");
      }
    });
  }
});


// -----------------------------------------------------------------
// TAB COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "tab",
  takes: {"tab name": noun_type_tab},

  execute: function( directObj ) {
    var tabName = directObj;
    var tabs = noun_type_tab.getTabs();
    tabs[tabName]._window.focus();
    tabs[tabName].focus();
  },

  preview: function( pblock, directObj ) {
    var tabName = directObj;
    if( tabName.length > 1 )
      pblock.innerHTML = "Changes to <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
    else
      pblock.innerHTML = "Switch to tab by name.";
  }
})

// Closes a single tab
CmdUtils.CreateCommand({
  name: "close-tab",
  takes: {"tab name": noun_type_tab},

  execute: function( directObj ) {
    var tabName = directObj;
    var tabs = noun_type_tab.getTabs();
    tabs[tabName].close();
    displayMessage(tabName + " tab closed");
  },

  preview: function( pblock, directObj ) {
    var tabName = directObj;
    if( tabName.length > 1 )
      pblock.innerHTML = "Closes the <b style=\"color:yellow\">%s</b> tab.".replace(/%s/, tabName);
    else
      pblock.innerHTML = "Closes the tab by name.";
  }
})

//Closes all tabs related to the specified word
CmdUtils.CreateCommand({
  name: "close-related-tabs",
  takes: {"related word": noun_arb_text},

  preview: function( pblock, directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var html = null;
    if(relatedWord.length != 0){
      html = "Closes the following tabs that are related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b> : <ul>";
      var numTabs = 0;

      Application.activeWindow.tabs.forEach(function(tab){
        if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
      	  html += "<li>" + tab.document.title + "</li>";
      	  numTabs++;
        }
      });

      if(numTabs == 0){
        html = "No tabs related to <b style=\"color:yellow\">\"" + relatedWord + "\"</b>";
      }else{
        html += "</ul>";
      }
    }else{
      html = "Closes all tabs related to the word";
    }
    jQuery(pblock).html( html );
  },

  execute: function( directObj ) {
    var query = directObj.text;
    var relatedWord = query.toLowerCase();
    var numTabs = 0;

    Application.activeWindow.tabs.forEach(function(tab){
      if ( tab.uri.spec.toLowerCase().match(relatedWord) || tab.document.title.toLowerCase().match(relatedWord)){
        tab.close();
        numTabs++;
      }
    });

    displayMessage(numTabs + " tabs closed");
  }

})

// -----------------------------------------------------------------
// PAGE EDIT COMMANDS
// -----------------------------------------------------------------

function cmd_delete() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = document.createElement("div");
      newNode.className = "_toRemove";
      range.surroundContents(newNode);
  }

  CmdUtils.loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideUp();
  });
}
cmd_delete.preview = function( pblock ) {
  pblock.innerHTML = "Deletes the selected chunk of HTML from the page.";
}

function cmd_undelete() {
  CmdUtils.loadJQuery(function() {
    var $ = window.jQuery;
    $("._toRemove").slideDown();
  });
}
cmd_undelete.preview = function( pblock ) {
  pblock.innerHTML = "Restores the HTML deleted by the delete command.";
}

function cmd_edit_page() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'true';
  CmdUtils.getDocumentInsecure().designMode='on';
}
cmd_edit_page.preview = function( pblock ) {
  pblock.innerHTML = "Make changes to this page. Use 'save' for changes to persist on reload.";
}
function cmd_save() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
  CmdUtils.getDocumentInsecure().designMode = 'off';

  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var body = jQuery( CmdUtils.getDocumentInsecure().body );

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), "ubiquity/edit", body.html(), 0, 4);

}
cmd_save.preview = function( pblock ) {
  pblock.innerHTML = "Saves page edits. Undo with 'remove-annotations'";
}

pageLoad_restorePageAnnotations = function () {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var uri = ioservice.newURI(window.content.location.href, null, null);

  var annotationNames = annotationService.getPageAnnotationNames(uri, {}); 

  for (var i=0; i<annotationNames.length; i++) {

    var annotationName, annotationValue;
    var startNode, endNode;
    var startXpath, endXpath;
    var startOffset, endOffset;

    if (annotationNames[i].match("ubiquity/delete/")) {
      annotationName = annotationNames[i].substring(16);
      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);

      // get xpaths out of name
      startXpath = annotationName.substring(0, annotationName.indexOf("#"));
      endXpath = annotationName.substring(annotationName.indexOf("#") + 1);

      // get offsets out of value
      startOffset = parseInt(annotationValue.substring(0, annotationValue.indexOf("#")));
      endOffset = parseInt(annotationValue.substring(annotationValue.indexOf("#") + 1));


      // find the nodes from the xpaths
      var iterator;
      iterator = doc.evaluate(startXpath, doc, null, XPathResult.ANY_TYPE, null);
      startNode = iterator.iterateNext();
      iterator = doc.evaluate(endXpath, doc, null, XPathResult.ANY_TYPE, null);
      endNode = iterator.iterateNext();


      // delete the text content in between the start and end nodes
      if (startNode == endNode) {
        startNode.textContent = startNode.textContent.substring(0, startOffset) +
          startNode.textContent.substring(endOffset);
      }
      else {
        startNode.textContent = startNode.textContent.substring(0, startOffset);
        var curNode = startNode.nextSibling;
        while (curNode && (curNode != endNode)) {
          curNode.textContent = "";
          curNode = curNode.nextSibling;
        }
        endNode.textContent = endNode.textContent.substring(endOffset);
      }

    }

    if (annotationNames[i] == "ubiquity/edit") {
      // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
      var body = jQuery( CmdUtils.getDocumentInsecure().body );

      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);
      body.html(annotationValue);

      // TODO: Fix "TypeError: head is not defined" on some pages

    }
  }
}

cmd_save.preview = function( pblock ) {
  pblock.innerHTML = "Saves edits you've made to this page in an annotation.";
}

// removes all page annotations - add more functionality
function cmd_remove_annotations() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  annotationService.removePageAnnotations(ioservice.newURI(window.content.location.href, null, null));

  window.content.location.reload();
}
cmd_remove_annotations.preview = function( pblock ) {
  pblock.innerHTML = "Resets any annotation changes you've made to this page.";
}


// permanent delete - in progress, slightly buggy
function cmd_perm_delete() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var document = context.focusedWindow.document;
  var sel      = context.focusedWindow.getSelection();
  var range    = sel.getRangeAt(0);

  var startNode = range.startContainer;
  var endNode   = range.endContainer;
  var startOffset = range.startOffset;
  var endOffset   = range.endOffset;
  var startXpath;
  var endXpath;

  // see if we need to modify the startNode xpath
  if (startNode.nodeType == 3) {
    // modify the offset with respect to the parent
    var children = startNode.parentNode.childNodes;
    var count = 0;
    while (children[count] != startNode) {
      startOffset = startOffset + children[count].textContent.length;
      count++;
    }
    // set the start node to its parent
    startNode = startNode.parentNode;
  }

  // see if we need to modify the endNode xpath
  if (endNode.nodeType == 3) {
    // modify the offset with respect to the parent
    var children = endNode.parentNode.childNodes;
    var count = 0;
    while (children[count] != endNode) {
      endOffset = endOffset + children[count].textContent.length;
      count++;
    }
    // set the start node to its parent
    endNode = endNode.parentNode;
  }

  var children = endNode.childNodes;
  for (var i=0; i<children.length; i++) {
    if (children[i] == startNode)
      displayMessage("found it");
  }
  startXpath = this.getXpath(startNode);
  endXpath = this.getXpath(endNode);

  //displayMessage("start: " + startXpath + ", end: " + endXpath);
  if (!startXpath || !endXpath) {
    displayMessage("Can't delete!");
    return;
  }
  if ((countChars(startXpath, '/') != countChars(endXpath, '/')) ||
       (sel.toString().length > endOffset-startOffset)) {
    displayMessage("Can't delete nicely!");
    return;
  }

  //endOffset = startOffset + sel.toString().length;

  // delete the text content in between the start and end nodes
  if (startNode == endNode) {
    startNode.textContent = startNode.textContent.substring(0, startOffset) +
                            startNode.textContent.substring(endOffset);
  }
  else {
    startNode.textContent = startNode.textContent.substring(0, startOffset);
    var curNode = startNode.nextSibling;
    while (curNode && (curNode != endNode)) {
      curNode.textContent = "";
      curNode = curNode.nextSibling;
    }
    endNode.textContent = endNode.textContent.substring(endOffset);
  }

  var annotationName = "ubiquity/delete/" + startXpath + "#" + endXpath;
  var annotationValue = startOffset + "#" + endOffset;

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), annotationName, annotationValue, 0, 4);

}
cmd_perm_delete.preview = function( pblock ) {
  pblock.innerHTML = "Attempts to permanently delete the selected part of the"
    + " page. (Experimental!)";
}
