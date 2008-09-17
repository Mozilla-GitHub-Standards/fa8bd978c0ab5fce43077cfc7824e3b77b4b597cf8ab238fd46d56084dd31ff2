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
 *   Atul Varma <atul@mozilla.com>
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

Components.utils.import("resource://ubiquity-modules/globals.js");

// util functions to make it easier to use objects as fake dictionaries
function dictDeepCopy( dict ) {
  var newDict = {};
  for (var i in dict ) {
    newDict[i] = dict[i];
  }
  return newDict;
};

function dictKeys( dict ) {
  return [ key for ( key in dict ) ];
}


NLParser.EnParsedSentence = function( verb, arguments, matchScore ) {
  /* DO and the values of modifiers should be NLParser.EnInputData
   * objects.
   */
  this._init( verb, arguments, matchScore );
}
NLParser.EnParsedSentence.prototype = {
  _init: function( verb, argumentSuggestions, matchScore) {
    /* modifiers is dictionary of preposition: noun */
    if (verb){
      this._verb = verb;
      this._argSuggs = argumentSuggestions;
    }
    this.matchScore = matchScore;
    this.frequencyScore = 0;
  },

  getCompletionText: function() {
    /* return plain text that we should set the input box to if user hits
     autocompletes to this sentence.  Currently unused! */
    var sentence = this._verb._name;
    for ( var x in this._argSuggs ) {
      if ( this._argSuggs[x] ) {
	let preposition;
	if (x == "direct_object")
	  preposition = " ";
	else
	  preposition = " " + x + " ";
	sentence = sentence + preposition + this._argSuggs[x].text;
      }
    }
    return sentence;
  },

  getDisplayText: function() {
    // returns html formatted sentence for display in suggestion list
    let sentence = this._verb._name;
    let label;
    for ( var x in this._verb._arguments ) {
      if ( this._argSuggs[ x ] && (this._argSuggs[x].text != "") ) {
	if (x == "direct_object")
	  label = "";
	else
	  label = x;
	sentence = sentence + " <b>" + label + " " + this._argSuggs[x].summary +
		   "</b>";
      } else {
	if ( x == "direct_object" ) {
	  label = this._verb._arguments[x].label;
	} else {
	  label = x + " " + this._verb._arguments[x].type._name;
        }
	sentence = sentence + " <span class=\"needarg\">(" +
	  label + ")</span>";
      }
    }
    return sentence;
  },

  getIcon: function() {
    return this._verb._icon;
  },

  execute: function(context) {
    return this._verb.execute( context, this._argSuggs );
  },

  preview: function(context, previewBlock) {
    this._verb.preview( context, this._argSuggs, previewBlock );
  },

  copy: function() {
    // Deep copy!
    let newArgSuggs = {};
    for (let x in this._argSuggs) {
      newArgSuggs[x] = {};
      for (let y in this._argSuggs[x])
	newArgSuggs[x][y] = this._argSuggs[x][y];
    }
    let newSentence = new NLParser.EnParsedSentence(this._verb,
						    newArgSuggs,
 						    this.matchScore);
    return newSentence;
  },
  setArgumentSuggestion: function( arg, sugg ) {
    this._argSuggs[arg] = sugg;
  },
  getArgText: function( arg ) {
    return this._argSuggs[arg].text;
  },

  argumentIsFilled: function( arg ) {
    return ( this._argSuggs[arg] != undefined );
  },

  equals: function(other) {
    if (this._verb._name != other._verb._name)
      return false;
    for (var x in this._argSuggs) {
      if (this._argSuggs[x].text != other._argSuggs[x].text)
	return false;
    }
    return true;
  },

  fillMissingArgsWithDefaults: function() {
    let newSentence = this.copy();
    let defaultValue;
    for (let argName in this._verb._arguments) {
      if (!this._argSuggs[argName]) {
	let missingArg = this._verb._arguments[argName];
        if (missingArg.default) {
	  defaultValue = CmdUtils.makeSugg(missingArg.default);
	} else if (missingArg.type.default) { // Argument value from nountype default
          defaultValue = missingArg.type.default();
	} else { // No argument
	  defaultValue = {text:"", html:"", data:null, summary:""};
	}
	newSentence.setArgumentSuggestion(argName, defaultValue);
      }
    }
    return newSentence;
  }

};

NLParser.EnPartiallyParsedSentence = function(verb, argStrings, selObj, matchScore) {
  /*This is a partially parsed sentence.
   * What that means is that we've decided what the verb is,
   * and we've assigned all the words of the input to one of the arguments.
   * What we haven't nailed down yet is the exact value to use for each
   * argument, because the nountype may produce multiple argument suggestions
   * from a single argument string.  So one of these partially parsed
   * sentences can produce several completely-parsed sentences, in which
   * final values for all arguments are specified.
   */
  this._init( verb, argStrings, selObj, matchScore);
  /* ArgStrings is a dictionary, where the keys match the argument names in
   * the verb, and the values are each a ["list", "of", "words"] that have
   * been assigned to that argument
   */
}
NLParser.EnPartiallyParsedSentence.prototype = {
  _init: function( verb, argStrings, selObj, matchScore ) {
    this._verb = verb;
    this._argStrings = argStrings;
    this._selObj = selObj;
    this._parsedSentences = [];
    this._matchScore = matchScore;
    this._valid = true;
    /* Create fully parsed sentence with empty arguments:
     * If this command takes no arguments, this is all we need.
     * If it does take arguments, this initializes the parsedSentence
     * list so that the algorithm in addArgumentSuggestion will work
     * correctly. */
    let newSen = new NLParser.EnParsedSentence(this._verb, {}, this._matchScore);
    this._parsedSentences = [newSen];

    for (let argName in this._verb._arguments) {
      if (! argStrings[argName] )
	continue;
      let nounType = this._verb._arguments[argName].type;
      let argSuggs = this._verb._suggestForNoun(nounType,
						argName,
						argStrings[argName],
						selObj);
      if (argStrings.length > 0 && argSuggs.length == 0) {
	//One of the arguments is supplied by the user, but produces
	// no suggestions, meaning it's an invalid argument for this
	// command -- that makes the whole parsing invalid!!
	this._parsedSentences = [];
	this._valid = false;
      }
      for each( let argSugg in argSuggs ) {
        this.addArgumentSuggestion( argName, argSugg );
      }
    }
  },

  addArgumentSuggestion: function( arg, sugg ) {
    //dump(" Adding suggestion: " + sugg.text + " for: " + arg + "\n");
    /* TODO: this function can eventually be used as a callback by
     * asynchronously suggestion-generating nouns.
     */

    // TODO: If an argument is set to a non-empty string, and its
    // corresponding nounType produces NO suggestions for that string,
    // then we shouldn't leave the argument unfilled -- we should declare
    // the whole partiallyParsedSentence to be an invalid parsing, and
    // getParsedSentences should return [];.

    let newSentences = [];
    let newSen;

    for each( let sen in this._parsedSentences) {
      if ( ! sen.argumentIsFilled( arg ) ) {
	//dump("Changing one.\n");
        sen.setArgumentSuggestion( arg, sugg);
      } else {
        //dump("Copying one.\n");
        let newSen = sen.copy();
        newSen.setArgumentSuggestion(arg, sugg);
	let duplicateSuggestion = false;
	for each( let alreadyNewSen in newSentences ) {
	  if (alreadyNewSen.equals(newSen))
	    duplicateSuggestion = true;
	}
	if (!duplicateSuggestion)
          newSentences.push( newSen );
      }
    }
    //dump("len of newSentences is " + newSentences.length + "\n");
    //dump("len of parsedSentences is " + this._parsedSentences.length + "\n");
    this._parsedSentences = this._parsedSentences.concat(newSentences);
    //dump("new len of parsedSentences is " + this._parsedSentences.length + "\n");
  },

  getParsedSentences: function() {
    /* For any parsed sentence that is missing any arguments, fill in those
     arguments with the defaults before returning the list of sentences.
     The reason we don't set the defaults directly on the object is cuz
     an asynchronous call of addArgumentSuggestion could actually fill in
     the missing argument after this.*/
    let parsedSentences = [];
    for each( let sen in this._parsedSentences) {
      parsedSentences.push(sen.fillMissingArgsWithDefaults());
    }

    return parsedSentences;
    // TODO sort these before returning them
  }
};


NLParser.EnVerb = function( cmd ) {
  if (cmd)
    this._init( cmd );
}
NLParser.EnVerb.prototype = {
  _init: function( cmd ) {
    /* cmd.DOType must be a NounType, if provided.
       cmd.modifiers should be a dictionary
       keys are prepositions
       values are NounTypes.
       example:  { "from" : City, "to" : City, "on" : Day } */
    this._execute = cmd.execute;
    this._preview = cmd.preview;
    this._name = cmd.name;
    this._icon = cmd.icon;
    this._synonyms = cmd.synonyms;
    this._arguments = {};

    // New-style API: command defines arguments dictionary
    if (cmd.arguments) {
      this._arguments = cmd.arguments;
    }

    /* Old-style API for backwards compatibility: command
       defines DirectObject and modifiers dictionary.  Convert
       this to argument dictionary. */
    if (cmd.DOType) {
      this._arguments.direct_object = {
	type: cmd.DOType,
	label: cmd.DOLabel,
	flag: null,
        default: cmd.DODefault
      };
    }

    if (cmd.modifiers) {
      for (let x in cmd.modifiers) {
	this._arguments[x] = {
	  type: cmd.modifiers[x],
	  label: x,
	  flag: x
	};
	if (cmd.modifierDefaults) {
	  this._arguments[x].default = cmd.modifierDefaults[x];
	}
      }
    }
  },

  execute: function( context, argumentValues ) {
    /* Once we convert all commands to using an arguments dictionary,
     * this can just pass argumentValues to _execute().  But for now,
     * commands expect the direct object to be separate, so pull it out
     * to pass it in separately.
     */
    let directObjectVal = null;
    if (argumentValues && argumentValues.direct_object) {
      // TODO: when direct obj is not specified, we should use a
      // nothingSugg, so argumentValues.direct_object should never be false.
      directObjectVal = argumentValues.direct_object;
    }
    return this._execute( context, directObjectVal, argumentValues );
  },

  preview: function( context, argumentValues, previewBlock ) {
    // Same logic as the execute command -- see comment above.
    if (this._preview) {
      let directObjectVal = null;
      if (argumentValues && argumentValues.direct_object)
        directObjectVal = argumentValues.direct_object;
      this._preview( context, directObjectVal, argumentValues, previewBlock );
    } else {
      // Command exists, but has no preview; provide a default one.
      var content = "Executes the <b>" + this._name + "</b> command.";
      previewBlock.innerHTML = content;
    }
  },

  // RecursiveParse is huge and complicated.
  // I think it should probably be moved from Verb to NLParser.
  recursiveParse: function(unusedWords, filledArgs, unfilledArgs, selObj, matchScore) {
    var x;
    var suggestions = [];
    var completions = [];
    var newFilledArgs = {};
    var newCompletions = [];
    // First, the termination conditions of the recursion:
    if (unusedWords.length == 0) {
      // We've used the whole sentence; no more words. Return what we have.
      return [new NLParser.EnPartiallyParsedSentence(this, filledArgs, selObj, matchScore)];
    } else if ( dictKeys( unfilledArgs ).length == 0 ) {
      // We've used up all arguments, so we can't continue parsing, but
      // there are still unused words.  This was a bad parsing; don't use it.
      return [];
    } else {
      // "pop" off the LAST unfilled argument in the sentence and try to fill it
      var argName = dictKeys( unfilledArgs ).reverse()[0];
      // newUnfilledArgs is the same as unfilledArgs without argName
      var newUnfilledArgs = dictDeepCopy( unfilledArgs );
      delete newUnfilledArgs[argName];

      // Look for a match for this preposition
      var nounType = unfilledArgs[argName].type;
      var nounLabel = unfilledArgs[argName].label;
      var preposition = unfilledArgs[argName].flag;
      for ( x = 0; x < unusedWords.length; x++ ) {
	if ( preposition == null || preposition == unusedWords[x] ) {
	  /* a match for the preposition is found at position x!
	   (require exact matches for prepositions.)
	   Anything following this preposition could be part of the noun.
           Check every possibility starting from "all remaining words" and
	   working backwards down to "just the word after the preposition."
	   */
	  let lastWordEnd = (preposition == null)? x : x +1;
	  let lastWordStart = (preposition == null)? unusedWords.length : unusedWords.length -1;
	  for (let lastWord = lastWordStart; lastWord >= lastWordEnd; lastWord--) {
	    //copy the array, don't modify the original
            let newUnusedWords = unusedWords.slice();
	    if (preposition != null) {
              // take out the preposition
	      newUnusedWords.splice(x, 1);
	    }
	    // pull out words from preposition up to lastWord, as nounWords:
            let nounWords = newUnusedWords.splice( x, lastWord - x );
            newFilledArgs = dictDeepCopy( filledArgs );
            newFilledArgs[ argName ] = nounWords;
            newCompletions = this.recursiveParse( newUnusedWords,
                                                  newFilledArgs,
                                                  newUnfilledArgs,
                                                  selObj,
						  matchScore);
	    completions = completions.concat(newCompletions);
	  }
	} // end if preposition matches
      } // end for each unused word
      // Try adding a completion where the argument is left blank.
      newCompletions = this.recursiveParse( unusedWords,
       					    filledArgs,
       					    newUnfilledArgs,
       					    selObj,
					    matchScore);
      completions = completions.concat( newCompletions );
      return completions;
    } // end if there are still arguments
  },

  suggestWithPronounSub: function( nounType, words, selObj ) {
    var suggestions = [];
    /* No selection to interpolate. */
    if ((!selObj.text) && (!selObj.html))
      return [];

    let selection = selObj.text;
    let htmlSelection = selObj.html;
    for each ( pronoun in NLParser.EN_SELECTION_PRONOUNS ) {
      let index = words.indexOf( pronoun );
      if ( index > -1 ) {
        if (selection) {
          let wordsCopy = words.slice();
          wordsCopy[index] = selection;
          selection = wordsCopy.join(" ");
            }
        if (htmlSelection) {
          let wordsCopy = words.slice();
          wordsCopy[index] = htmlSelection;
          htmlSelection = wordsCopy.join(" ");
        }
        try {
          let moreSuggs = nounType.suggest(selection, htmlSelection);
          suggestions = suggestions.concat( moreSuggs );
        } catch(e) {
          Components.utils.reportError("Exception occured while getting suggestions for: " + this._name);
        }
      }
    }
    return suggestions;
  },

  _suggestForNoun: function(nounType, nounLabel, words, selObj) {
    var suggestions = this.suggestWithPronounSub( nounType, words, selObj);
    try {
      let moreSuggestions = nounType.suggest(words.join(" "));
      // TODO strip out null suggestions right here...
      suggestions = suggestions.concat(moreSuggestions);
    } catch(e) {
      Components.utils.reportError(
          'Exception occured while getting suggestions for "' + this._name +
          '" with noun "' + nounLabel + '"'
          );
    }
    return suggestions;
  },

  getCompletions: function( words, selObj ) {
    /* returns a list of ParsedSentences, each with a quality ranking.
       words is an array of all the words in the input (already split).
       selObj is a selectionObject, wrapping both the text and html
       selections.
    */
    let completions = [];
    let partials = [];
    let inputVerb = words[0];
    let matchScore = this.match( inputVerb );
    //dump("Verb.getCompletions: matchScore is " + matchScore + "\n");
    if (matchScore == 0) {
      // Not a match to this verb!
      return [];
    }

    let inputArguments = words.slice(1);
    //dump("Verb.getCompletions: inputArguments are " + inputArguments.join(" ") + "\n");
    if (inputArguments.length == 0) {
      // make suggestions by trying selection as each argument...
      for (let x in this._arguments) {
        let argStrings = {};
        argStrings[x] = [selObj.text]; // TODO how to use HTML?

        partials.push(new NLParser.EnPartiallyParsedSentence(this,
                                                             argStrings,
                                                             selObj,
  							     matchScore));
        }
      // also, try a completion with all empty arguments
      partials.push(new NLParser.EnPartiallyParsedSentence(this, {}, selObj, matchScore));
    }
    else {
      partials = this.recursiveParse( inputArguments, {}, this._arguments, selObj, matchScore);
    }

    //dump("Partials.length is " + partials.length + "\n");

    // partials is now a list of PartiallyParsedSentences; get the specific
    // parsings
    for each( let part in partials ) {
      dump
      completions = completions.concat( part.getParsedSentences());
    }

    // score each completion based on how well the verb matched
    // LONGTERM TODO: also score based on how well the arguments matched!!
    for each( let comp in completions) {
      comp.matchScore = matchScore;
    }
    return completions;
  },

  getCompletionsFromNounOnly: function(text, html) {
    let completions = [];
        // Try to complete sentence based just on given noun, no input arguments.
    let partials = [];
    if ((!text) && (!html))
      return [];

    // TODO... how can we use HTML for noun completions now?
    // Try it as each argument...
    for (let x in this._arguments) {
      let argStrings = {};
      argStrings[x] = [text];
      let selObj = {
	text: text,
	html: html
      };
      let matchScore = this._arguments[x].type.rankLast ? 0 : 1;
      let partial = new NLParser.EnPartiallyParsedSentence(this,
                                                           argStrings,
                                                           selObj,
  							   matchScore);
      completions = completions.concat( partial.getParsedSentences());
    }
    return completions;
  },

  match: function( inputWord ) {
    /* returns a float from 0 to 1 telling how good of a match the input
       is to this verb.  Return value will be used for sorting.
       The current heuristic is extremely ad-hoc but produces the ordering
       we want... so far.*/

    if (this._name == inputWord)
      // Perfect match always gets maximum rating!
      return 1.0;

    let index = this._name.indexOf( inputWord );
    if ( index == 0 ) {
      // verb starts with the input! A good match.
      // The more letters of the verb that have been typed, the better the
      // match is. (Note this privileges short verbs over longer ones)
      return 0.75 + 0.25 * (inputWord.length / this._name.length);
    }

    if ( index > 0 ) {
      // The input matches the middle of the verb.  Not such a good match but
      // still a match.
      return 0.5 + 0.25 * (inputWord.length / this._name.length);
    }

    // Look for a match on synonyms:
    if ( this._synonyms && this._synonyms.length > 0) {
      for each( let syn in this._synonyms) {
	index = syn.indexOf( inputWord );
	if (index == 0) {
	  return 0.25 + 0.25 * (inputWord.length / syn.length);
	}
	if (index > 0 ) {
	  return 0.25 * (inputWord.length / syn.length);
	}
      }
    }

    // No match at all!
    return 0.0;

    // TODO: disjoint matches, e.g. matching "atc" to "add-to-calendar"
  }
};
