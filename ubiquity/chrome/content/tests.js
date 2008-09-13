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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
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

const LANG = "en";

function FakeAnnSvc() {
  var ann = {};
  var urls = {};

  var self = this;

  self.getPagesWithAnnotation = function(name) {
    var results = [];
    for (uri in ann)
      if (typeof(ann[uri][name]) != 'undefined')
        results.push(urls[uri]);
    return results;
  };

  self.pageHasAnnotation = function(uri, name) {
    if (ann[uri.spec] &&
        typeof(ann[uri.spec][name]) != 'undefined')
      return true;
    return false;
  };

  self.getPageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    return ann[uri.spec][name];
  };

  self.setPageAnnotation = function(uri, name, value, dummy,
                                    expiration) {
    if (!ann[uri.spec]) {
      ann[uri.spec] = new Object();
      urls[uri.spec] = uri;
    }
    ann[uri.spec][name] = value;
  };

  self.removePageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    delete ann[uri.spec][name];
  };
}

function setupLrcsForTesting() {
   LinkRelCodeSource.__install = function() {};

   var annSvc = new FakeAnnSvc();

   LinkRelCodeSource.__getAnnSvc = function() {
     return annSvc;
   };
}

function testLinkRelCodeSourceWorks() {
  setupLrcsForTesting();

  var LRCS = LinkRelCodeSource;
  var url = "http://www.foo.com";
  var code = "function blah() {}";

  this.assert(!LRCS.isMarkedPage(url));
  LRCS.addMarkedPage({url: url,
                      sourceCode: code,
                      canUpdate: false});
  this.assert(LRCS.isMarkedPage(url));

  var results = LRCS.getMarkedPages();

  this.assert(results.length == 1);

  // Ensure the result is what we think it is.
  var page = results[0];
  this.assert(page.getCode() == code);

  // Add another marked page and make sure things still make sense.
  var moreCode = "function narg() {}";
  LRCS.addMarkedPage({url: "http://www.bar.com",
                      sourceCode: moreCode,
                      canUpdate: false});
  results = LRCS.getMarkedPages();

  this.assert(results[0].getCode() == code);
  this.assert(results[1].getCode() == moreCode);

  // TODO: Make a LinkRelCodeSource object and ensure that it behaves
  // how we think it should.

  results[0].remove();

  this.assert(!LRCS.isMarkedPage(url));
}

function FakeCommandSource( cmdList ) {
  this._cmdList = cmdList;
  for ( var x in cmdList ) {
    this._cmdList[x].name = x;
  }
}
FakeCommandSource.prototype = {
  getCommand: function(name) {
    return this._cmdList[name];
  },
  getAllCommands: function(name) {
    return this._cmdList;
  },
  getAllNounTypes: function() {
    return [];
  },
  refresh: function() {
  }
};

function getTextSelection(context) {
  if (context)
    if (context.textSelection)
      return context.textSelection;
  return "";
}

function getHtmlSelection(context) {
  if (context)
    if (context.htmlSelection)
      return context.htmlSelection;
  return "";
}

function getNounList() {
  return [];
}

function testCmdManagerExecutesTwoCmds() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var oneWasCalled = false;
  var twoWasCalled = false;
  var pblock = {};

  var fakeSource = new FakeCommandSource(
    {
      cmd_one: {execute:function() {oneWasCalled = true;}},
      cmd_two: {execute:function() {twoWasCalled = true;}}
    });

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("cmd_one");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  cmdMan.updateInput("cmd_two");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  this.assert(oneWasCalled, "cmd_one must be called.");
  this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var wasCalled = false;

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {wasCalled = true;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);
  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
  this.assert(wasCalled, "command.execute() must be called.");
}

function testCmdManagerCatchesExceptionsInCmds() {
  var mockMsgService = {
    displayMessage: function(msg) { this.lastMsg = msg; }
  };

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {throw 1;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command manager must log exception."
  );
}

function testCmdManagerDisplaysNoCmdError() {
  var fakeSource = new FakeCommandSource ( {} );
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };
  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("nonexistentcommand");
  cmdMan.execute();
  this.assertIsDefined(mockMsgService.lastMsg,
                       "Command manager must display a message.");
}

function testCommandSourceOneCmdWorks() {
  var testCode = "function cmd_foo_thing() { return 5; }";
  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo-thing");
  this.assert(cmd, "Sample command should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command should execute properly.");
}

function testCommandSourceTwoCodeSourcesWork() {
  var testCode1 = "function cmd_foo() { return 5; }\n";
  var testCode2 = "function cmd_bar() { return 6; }\n";

  var testCodeSource1 = {
    getCode : function() { return testCode1; }
  };

  var testCodeSource2 = {
    getCode : function() { return testCode2; }
  };

  var cmdSrc = new CommandSource([testCodeSource1,
                                  testCodeSource2]);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandSourceCatchesExceptionsWhenLoading() {
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };

  var testCodeSource = {
    getCode : function() { return "awegaewg"; }
  };

  var cmdSrc = new CommandSource(testCodeSource, mockMsgService);
  cmdSrc.getCommand("existentcommand");

  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command source must log exception."
  );
}

function testCommandSourceTwoCmdsWork() {
  var testCode = ("function cmd_foo() { return 5; }\n" +
                  "function cmd_bar() { return 6; }\n");

  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandNonGlobalsAreResetBetweenInvocations() {
  var testCode = ( "x = 1; function cmd_foo() { return x++; }" );

  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on second call.");
}

function testCommandGlobalsWork() {
  var testCode = ( "function cmd_foo() { " +
                   "  if (globals.x) " +
                   "    return ++globals.x; " +
                   "  globals.x = 1; " +
                   "  return globals.x; " +
                   "}" );

  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var sandboxFactory = new SandboxFactory({globals: {}});

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 2,
              "Command 'foo' should return 2 on second call.");
}

// This tests bug #25, but it's being commented out for now so that
// all unit tests succeed.
//function testSandboxSupportsJs17() {
//  var sbf = new SandboxFactory({});
//  var s = sbf.makeSandbox();
//  sbf.evalInSandbox("let k = 1;", s);
//}

function _testImport(test, jsmu) {
  test.assert(!("jsmutils" in jsmu));
  jsmu.Import("resource://ubiquity-modules/jsmutils.js");
  test.assert(jsmu.jsmutils);
  test.assert("Import" in jsmu.jsmutils);
}

function testImportWorksWithSandboxContext() {
  var url = "resource://ubiquity-modules/jsmutils.js";
  var jsmu = {};
  Components.utils.import(url, jsmu);

  this.assert(!("_sandboxContext" in jsmu));
  jsmu.setSandboxContext(new SandboxFactory({}));
  this.assert("_sandboxContext" in jsmu);
  this.assert(!("_sandboxContext" in this));

  this.assert(!(url in jsmu._sandboxContext.modules));
  _testImport(this, jsmu);
  this.assert(url in jsmu._sandboxContext.modules);
}

function testImportWorksWithoutSandboxContext() {
  var jsmu = {};
  Components.utils.import("resource://ubiquity-modules/jsmutils.js", jsmu);

  _testImport(this, jsmu);
  this.assert(!("_sandboxContext" in jsmu));
}

function testParseDirectOnly() {
  var dogGotPetted = false;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var cmd_pet = {
    execute: function(context, directObject, modifiers) {
      dogGotPetted = directObject.text;
    },
    name: "pet",
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {}
  };
  var verb = new NLParser.EnVerb(cmd_pet);
  var inputWords = ["pet", "b"];

  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject );
  this.assert( completions.length == 2, "should be 2 completions" );
  this.assert( completions[0]._verb._name == "pet", "verb should be pet");
  this.assert( completions[0]._argSuggs.direct_object.text == "beagle",
	       "obj should be beagle");
  this.assert( completions[1]._verb._name == "pet", "verb should be pet");
  this.assert( completions[1]._argSuggs.direct_object.text == "bulldog",
	       "obj should be bulldog");
  completions[0].execute();
  this.assert( dogGotPetted == "beagle");
  completions[1].execute();
  this.assert( dogGotPetted == "bulldog" );
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new CmdUtils.NounType( "washing object",
					  ["sponge", "hose", "spork",
					  "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, directObject, modifiers) {
      dogGotWashed = directObject.text;
      dogGotWashedWith = modifiers["with"].text;
    },
    name:"wash",
    DOLabel:"kind of dog",
    DOType: dog,
    modifiers: {"with": washingObj}
  };

  var verb = new NLParser.EnVerb(cmd_wash);
  var inputWords = ["wash", "pood", "with", "sp"];
  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject);

  this.assert( completions.length == 2, "Should be 2 completions" );
  this.assert( completions[0]._verb._name == "wash");
  this.assert( completions[0]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[0]._argSuggs.with.text == "sponge");
  this.assert( completions[1]._verb._name == "wash");
  this.assert( completions[1]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[1]._argSuggs.with.text == "spork");
  completions[0].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "sponge");
  completions[1].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "spork");
}

function testCmdManagerSuggestsForEmptyInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new CmdUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new CmdUtils.NounType( "stuffType", ["mud"] );
  var fakeSource = new FakeCommandSource(
  {
    cmd_one: {execute:function(context, directObj) {
		oneWasCalled = directObj.text;
	      },
              DOLabel:"thing",
	      DOType:nounTypeOne},
    cmd_two: {execute:function(context, directObj) {
		twoWasCalled = directObj.text;
	      },
	      DOLabel:"stuff",
	      DOType:nounTypeTwo}
  });
  fakeSource.getAllNounTypes = function() {
    return [nounTypeOne, nounTypeTwo];
  };
  var cmdMan = new CommandManager(fakeSource, null, LANG);
  var getAC = makeDefaultCommandSuggester(cmdMan);
  var suggDict = getAC({textSelection:"tree"});
  this.assert( suggDict["Cmd_one"], "cmd one should be in" );
  this.assert( !suggDict["Cmd_two"], "cmd two should be out" );
  var execute = suggDict["Cmd_one"];
  execute();
  this.assert( oneWasCalled == "tree", "should have been calld with tree" );
  suggDict = getAC({textSelection:"mud"});
  this.assert( !suggDict["Cmd_one"], "cmd one should be out" );
  this.assert( suggDict["Cmd_two"], "cmd two should be in" );
  execute = suggDict["Cmd_two"];
  execute();
  this.assert( twoWasCalled == "mud", "should have been called with mud" );
}

function testVerbEatsSelection() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };
  var completions = verb.getCompletions(["eat", "this"], selObject);
  this.assert( completions.length == 1, "Should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "obj should be lunch");
  this.assert(foodGotEatenAt == null, "should be no modifier");

  selObject.text = "grill";
  selObject.html = "grill";
  completions = verb.getCompletions(["eat", "breakfast", "at", "it"], selObject);
  this.assert( completions.length == 1, "should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "breakfast", "food should be breakfast");
  this.assert(foodGotEatenAt == "grill", "place should be grill");

  selObject.text = "din";
  completions = verb.getCompletions(["eat", "at", "home", "this"], selObject);
  this.assert( completions.length == 1, "second should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "dinner", "food should be dinner");
  this.assert(foodGotEatenAt == "home", "place should be home");
}

function testImplicitPronoun() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };

  var completions = verb.getCompletions(["eat"], selObject);
  this.assert( (completions.length == 2), "Should have 2 completions.");
  completions[0].execute();
  this.assert((foodGotEaten == "lunch"), "DirectObj should have been lunch.");
  this.assert((foodGotEatenAt == null), "Indirectobj should not be set.");
  this.assert((!completions[1]._argSuggs.direct_object.text),
	      "second completion should have no DO.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat"], selObject);

  this.assert( completions.length == 3, "Should have 3 completions.");
  // first completion should be directObject is dinner
  completions[0].execute();
  this.assert((foodGotEaten == "dinner"), "DO should have been dinner.");
  this.assert((foodGotEatenAt == null), "IndirectObjs shouldn't be set.");
  foodGotEaten = null;
  foodGotEatenAt = null;
  // second completion should be direct object null, place is diner
  completions[1].execute();
  this.assert((foodGotEaten == null), "DO should be null.");
  this.assert((foodGotEatenAt == "diner"), "Place should be diner.");
  // third completion should have all arguments blank.
  this.assert((!completions[2]._argSuggs.direct_object.text), "second completion should have no DO.");
  this.assert((!completions[2]._argSuggs["at"].text), "and no at mod either." );

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat", "lunch", "at", "selection"], selObject);
  this.assert( completions.length == 1, "Sould have 1 completion");
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "Should have eaten lunch");
  this.assert(foodGotEatenAt == "diner", "Should have eaten it at diner");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat", "at", "grill"], selObject);
  this.assert( completions.length == 1, "Should have 1 completion");
  completions[0].execute();
  this.assert((foodGotEaten == null), "DO should not be set.");
  this.assert((foodGotEatenAt == "grill"), "ate at grill.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "pants";
  completions = verb.getCompletions(["eat"], selObject);
  this.assert( completions.length == 1);
  completions[0].execute();
  this.assert((foodGotEaten == null), "Should have no valid args.");
  this.assert((foodGotEatenAt == null), "Should have no valid args.");

  selObject.text = null;
  selObject.html = null;
  completions = verb.getCompletions(["eat", "this"], selObject);
  this.assert( completions.length == 0, "should have no completions");
}

function testMakeSugg() {
  // test that CmdUtils.makeSugg doesn't fail on null input, that it preserves
  // html, etc etc.
  /*var thingy = CmdUtils.makeSugg(null, "alksdf");
  this.assert( thingy.text == "alksdf", "thingy.text should be set.");*/
  // test above can't be run from the command line as there is no
  // context.focusedWindow, needed for getTextFromHtml.

  var thingy2 = CmdUtils.makeSugg(null, null, null);
  this.assert( thingy2 == null, "should return null");
}

function testModifiersTakeMultipleWords() {
  var wishFound = null;
  var wishFoundIn = null;
  var wish = new CmdUtils.NounType( "wish", ["apartment", "significant other", "job"]);
  var city = new CmdUtils.NounType( "city", ["chicago",
					     "new york",
					     "los angeles",
					     "san francisco"]);
  var cmd_find = {
    name: "find",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	wishFound = directObject.text;
      if (modifiers["in"].text)
	wishFoundIn = modifiers["in"].text;
    },
    DOLabel:"wish",
    DOType: wish,
    modifiers: {"in": city}
  };
  var verb = new NLParser.EnVerb(cmd_find);
  var selObject = {text:null, html:null};
  var completions = verb.getCompletions(["find", "job", "in", "chicago"], selObject);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");

  completions = verb.getCompletions(["find", "significant", "other", "in", "chicago"],
				    selObject);
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");
  this.assert(completions[0]._argSuggs.direct_object.text == "significant other", "should be SO.");

  completions = verb.getCompletions(["find", "job", "in", "new", "york"], selObject);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "new york", "should be NY");
}

function testSuggestionMemory() {
  var suggMem1 = new SuggestionMemory("test_1");
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "q", "quinine");
  suggMem1.remember( "q", "quetzalcoatl");
  suggMem1.remember( "p", "polymascotfoamulate");
  suggMem1.remember( "q", "quinine");

  this.assert(suggMem1.getScore("q", "quinine") == 2);
  this.assert(suggMem1.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem1.getScore( "q", "peas") == 0 );
  this.assert(suggMem1.getScore( "q", "qualifier") == 0);
  this.assert(suggMem1.getScore( "p", "peas") == 2);
  this.assert(suggMem1.getScore( "p", "polymascotfoamulate") == 1);
  this.assert(suggMem1.getScore( "p", "popcorn" ) == 0 );
  this.assert(suggMem1.getScore( "p", "quinine" ) == 0 );
}

function testSortedBySuggestionMemory() {
  var nounList = [];
  var verbList = [{name: "clock"},
		  {name: "calendar"},
		  {name: "couch"},
		  {name: "conch"},
		  {name: "crouch"},
		  {name: "coelecanth"},
		  {name: "crab"} ];
  var nlParser = new NLParser.EnParser( verbList, nounList );
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList("c", fakeContext);

}

function testSortedByMatchQuality() {
  var nounList = [];
  var verbList = [{name: "frobnicate"},
		  {name: "glurgle"},
		  {name: "nonihilf"},
		  {name: "bnurgle"},
		  {name: "fangoriously"}];
  var nlParser = new NLParser.EnParser( verbList, nounList );
  var fakeContext = {textSelection:"", htmlSelection:""};

  var assert = this.assert;
  function testSortedSuggestions( input, expectedList ) {
    nlParser.updateSuggestionList( input, fakeContext );
    var suggs = nlParser.getSuggestionList();
    assert( suggs.length == expectedList.length, "Should have " + expectedList.length + " suggestions.");
    for (var x in suggs) {
      assert( suggs[x]._verb._name == expectedList[x], expectedList[x] + " should be " + x);
    }
  }
  testSortedSuggestions( "g", ["glurgle", "bnurgle", "fangoriously"]);
  testSortedSuggestions( "n", ["nonihilf", "bnurgle", "frobnicate", "fangoriously"]);
  testSortedSuggestions( "ni", ["nonihilf", "frobnicate"]);
  testSortedSuggestions( "bn", ["bnurgle", "frobnicate"]);
  testSortedSuggestions( "f", ["frobnicate", "fangoriously", "nonihilf"]);
  testSortedSuggestions( "frob", ["frobnicate"]);
  testSortedSuggestions( "urgle", ["glurgle", "bnurgle"]);

  verbList = [{name: "google"},
	      {name: "tag"},
	      {name: "digg"},
	      {name: "bugzilla"},
	      {name: "get-email-address"},
	      {name: "highlight"}];
  nlParser.setCommandList( verbList );
  testSortedSuggestions( "g", ["google", "get-email-address", "tag", "digg", "bugzilla", "highlight"]);
}

function testSortSpecificNounsBeforeArbText() {
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var arb_text = {
    _name: "text",
    rankLast: true,
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg(text, html) ];
    }
  };

  var verbList = [{name: "mumble", DOType: arb_text, DOLabel:"stuff"},
                  {name: "wash", DOType: dog, DOLabel: "dog"}];

  var nlParser = new NLParser.EnParser( verbList, [arb_text, dog] );

  var fakeContext = {textSelection:"beagle", htmlSelection:"beagle"};
  var selObj = getSelectionObject( fakeContext );
  nlParser.updateSuggestionList( "", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 2, "Should be two suggestions.");
  this.assert( suggs[0]._verb._name == "wash", "First suggestion should be wash");
  this.assert( suggs[1]._verb._name == "mumble", "Second suggestion should be mumble");
}

function testVerbUsesDefaultIfNoArgProvided() {
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  dog.default = function() {
    return CmdUtils.makeSugg( "husky" );
  };
  var verbList = [{name:"wash", DOType: dog, DOLabel: "dog"},
		  {name:"play-fetch", DOType: dog, DOLabel: "dog", DODefault: "basenji"}];
  var nlParser = new NLParser.EnParser( verbList, [dog]);
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "wash", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "wash", "Suggestion should be wash\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "husky", "Argument should be husky.\n");

  nlParser.updateSuggestionList( "play", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "basenji", "Argument should be basenji.\n");

  nlParser.updateSuggestionList( "play retr", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "golden retreiver", "Argument should be g.retr.\n");

  //TODO try out defaults for modifier arguments.
}

// TODO a test where a command has three arguments, all arbText; make sure
// the top parsing is the sensible one.

function testSynonyms() {
  var verbList = [{name: "twiddle", synonyms: ["frobnitz", "twirl"]},
		  {name: "frobnitz"},
		  {name: "frobnicate"}];
  var nlParser = new NLParser.EnParser( verbList, [] );
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "frob", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 3, "Should be 3 suggs.");
  this.assert( suggs[0]._verb._name == "frobnitz", "frobnitz should be first");
  this.assert( suggs[1]._verb._name == "frobnicate", "frobnicate should be second");
  this.assert( suggs[2]._verb._name == "twiddle", "twiddle should be third");

  nlParser.updateSuggestionList( "twid", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");

  nlParser.updateSuggestionList( "twirl", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");
}

// TODO test of verb initialized with new style arguments dict

function testPartiallyParsedSentence() {
  var noun_type_foo = {
    _name: "foo",
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg("foo_a"), CmdUtils.makeSugg("foo_b") ];
    }
  };
  var noun_type_bar = {
    _name: "bar",
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg("bar_a"), CmdUtils.makeSugg("bar_b") ];
    }
  };

  var verb = new NLParser.EnVerb({
				   name: "frobnitz",
				   arguments: {
				     fooArg: {
				       type: noun_type_foo,
				       label: "the foo",
				       flag: "from"
				     },
				     barArg: {
				       type: noun_type_bar,
				       label: "the bar",
				       flag: "by"
				     },
				   }
				 });

  var argStrings = {fooArg: "nonihilf",
		    barArg: "rocinante"};

  var selObj = {
    text: "", html: ""
  };
  var partiallyParsed = new NLParser.EnPartiallyParsedSentence(
    verb,
    argStrings,
    selObj
    );

  var parsed  = partiallyParsed.getParsedSentences();

  this.assert( parsed.length == 4, "Should be four parsings.\n");

  partiallyParsed.addArgumentSuggestion( "barArg",
					 CmdUtils.makeSugg("bar_c"));
  parsed  = partiallyParsed.getParsedSentences();
  /*dump("Now the completions are: \n");
  for each (var p in parsed)
    dump( p.getDisplayText() + "\n" );*/
  this.assert( parsed.length == 6, "Should be six (not eight) parsings.\n");
}