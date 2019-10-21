/* MIT License

Copyright 2018–2019 Florian Rivoal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

var webslides = {
	// take anchor into account
	currentSlide : null,
	currentState : null,
	options : {
		onScreenNav : true,
		verboseLog : false,
	}
};

window.addEventListener("DOMContentLoaded", function() {
	/* State Management */
	function clearActiveState( element, state ) {
		if (state) {
			state.levelNames().forEach( function(name) {
				element.classList.remove("in-"+name);
				element.classList.remove("from-"+name);
			});
		}
	}

	function clearActiveInState( element, state ) {
		if (state) {
			state.levelNames().forEach( function(name) {
				element.classList.remove("in-"+name);
			});
		}
	}

	function setInState( element, state ) {
		if (state) {
			state.levelNames().forEach( function(name) {
				element.classList.add("in-"+name);
			});
		}
	}

	function clearStates( element ) {
		var toRemove = new Set();
		element.classList.forEach( function(c) {
			if (c.startsWith("from-") ||
			    c.startsWith("in-")) {
				toRemove.add(c);
			}
		});
		toRemove.forEach( function(c) {
			element.classList.remove(c);
		});
	}

	function setFromStates( element, states) {
		if (states) {
			states.forEach(function(state) {
				state.levelNames().forEach( function(name) {
					element.classList.add("from-"+name);
				});
			});
		}
	}

	/* Document preparation */
	function createState(name) {
		var subStates = [];
		var self = {
			_dbg_n: name,
			name: function() { return name; },
			levelNames: function() { return [name]; },
		}
		return self;
	}
	function createSlide(elem) {
		var states = [];
		states.includesState = function(name) {
			return !! states.find( function(e) {
				return e.name() == name;
			});
		}
		var savedState = null;
		var self = {
			_dbg_states: states,
			appendState: function(name, option) {
				if (name == "print") {
						console.warn(`Slide #${elem.id}: 'print' is a reserved state name.`);
				}
				if (option instanceof Object &&
				    option.implicit) {
					if (!states.includesState(name)) {
						states.push(createState(name));
						if (webslides.options.verboseLog){
							console.log(`Slide #${elem.id}: '${name}' state declared implicitely.`);
						}
					}
				} else {
					if (states.includesState(name)) {
						console.warn(`Slide #${elem.id}: '${name}' state declared multiple times.`);
					} else {
						states.push(createState(name));
					}
				}
			},
			appendStates: function(names, option){
				var that = this;
				if (names) {
					names.split(" ").forEach(function(name) {
						that.appendState(name, option);
					});
				}
			},
			states: function () {
				return states;
			},
			lastState: function () {
				return states[states.length-1];
			},
			stateAfter: function (currentState) {
				if (currentState) {
					var i = states.findIndex(function(e) {
						return e.name() == currentState.name();
					});
					if (i != -1) {
						return states[i+1];
					}
				} else {
					return states[0];
				}
			},
			stateBefore: function (currentState) {
				var i = states.findIndex(function(e) {
					return e.name() == currentState.name();
				});
				return states[i-1];
			},
			element: function() {
				return elem;
			},
			id: function() {
				return elem.id;
			},
			saveState: function(state) {
				savedState = state;
			},
			restoreState: function() {
				webslides.currentState = savedState;
				if (savedState) {
					var se = webslides.currentSlide.element();
					clearStates(se);
					setInState(se, savedState);
					for (var s = savedState; s; s = webslides.currentSlide.stateBefore(s)) {
						setFromStates(se, [s]);
					}
				}
			},
		}
		return self;
	}

	function initSlideTree() {
		var tree = [];

		/* Set up Slide Tree APIs*/
		webslides.forEachSlide = function(f) {
			tree.forEach(f);
		}
		webslides.getSlide = function(sid) {
			return tree.find(function(e) {
				return e.id() == sid;
			});
		}
		webslides.slideBefore = function(current) {
			var i = tree.findIndex(function(e) {
				return e.id() == current.id();
			});
			return tree[i-1];
		}
		webslides.slideAfter = function(current) {
			var i = tree.findIndex(function(e) {
				return e.id() == current.id();
			});
			return tree[i+1];
		}

		/* Initialize the Slide Tree */
		var slideElements = document.querySelectorAll("body > section");
		slideElements.forEach(function(se) {
			var s = createSlide(se);
			tree.push(s);
			var dataStates = se.getAttribute("data-states");
			s.appendStates(dataStates);
			se.querySelectorAll("[data-visible-from]", "[data-visible-in]").forEach(function(e) {
				var impliedStates = "" + e.getAttribute("data-visible-from") || "" + e.getAttribute("data-visible-in") || "";
				s.appendStates(impliedStates, {implicit: true});
			});
		});
	}

	function generateStateStyle() {
		var statesNames = new Set();
		webslides.forEachSlide(function(slide) {
			slide.states().forEach(function(state) {
				state.levelNames().forEach(function(name) {
					statesNames.add(name);
				});
			});
		});
		var styles = "";
		statesNames.forEach(function(s) {
			styles += ":root.uses-script .in-"+s+" [data-visible-in~=\""+s+"\"] { visibility: visible; }\n";
			styles += ":root.uses-script .from-"+s+" [data-visible-from~=\""+s+"\"] { visibility: visible; }\n";

		});
		var style_elm = document.createElement("style");
		style_elm.innerHTML = styles;
		document.head.append(style_elm);
	}

	function addSlideNumbers() {
		var slides = document.querySelectorAll("body > section");
		for (var i = 0; i < slides.length; i++) {
			if (!slides[i].id) {
				slides[i].id="slide_"+i;
				console.warn(`Slide number ${i} does not have an id. Autogenerating one. Manually add an id to be able to link to this slide when javascript is off.`);
			}
		}
	}


	/* Navigation */
	function next() {
		document.documentElement.classList.add("uses-script");

		var next = webslides.currentSlide.stateAfter(webslides.currentState);
		if (next) {
			var se = webslides.currentSlide.element();
			clearActiveInState(se, webslides.currentState);
			webslides.currentState = next;
			setFromStates(se, [webslides.currentState]);
			setInState(se, webslides.currentState);

		} else {
			nextSlide();
		}
	}

	function nextSlide() {
		var next = webslides.slideAfter(webslides.currentSlide);
		if (next)  {
			webslides.currentSlide.saveState(webslides.currentState);
			webslides.currentState = null;

			var se = webslides.currentSlide.element();
			clearStates(se);
			setFromStates(se, webslides.currentSlide.states());

			webslides.currentSlide = next;
			clearStates(webslides.currentSlide.element());
			var hash = webslides.currentSlide.id();
			history.pushState(null, document.title+" @ "+hash, "#"+hash);
			resnap();
		}
	}

	function prev() {
		document.documentElement.classList.add("uses-script");
		if (webslides.currentState) {
			var se = webslides.currentSlide.element();
			clearActiveState(se, webslides.currentState);
			var prev = webslides.currentSlide.stateBefore(webslides.currentState);
			webslides.currentState = prev;
			if (prev) {
				setFromStates(se, [prev]);
				setInState(se, prev);
			}
		} else {
			prevSlide();
		}
	}

	function prevSlide() {
		var prev = webslides.slideBefore(webslides.currentSlide);
		if (prev) {
			webslides.currentSlide.saveState(webslides.currentState);
			clearStates(webslides.currentSlide.element());

			webslides.currentSlide = prev;
			var se = webslides.currentSlide.element();
			setFromStates(se, webslides.currentSlide.states());
			webslides.currentState = webslides.currentSlide.lastState();
			if (webslides.currentState) {
				setInState(se, webslides.currentState );
			}
			var hash = webslides.currentSlide.id();
			history.pushState(null, document.title+" @ "+hash, "#"+hash);
		}
		resnap();
	}

	/* Consistency of URL and position */
	function resnap() {
		webslides.currentSlide.element().scrollIntoView();
	}

	function initCurrentSlide() {
		var anchor = document.URL.replace(/^[^#]*#?/, "");
		if (anchor) {
			webslides.currentSlide = webslides.getSlide(document.querySelector("body > section#"+anchor).id);
			webslides.currentState = null;
		} else {
			webslides.currentSlide = webslides.getSlide(document.querySelector("body > section:first-of-type").id);
			webslides.currentState = null;
		}
	}

	function updateURLFromScroll() {
		var slides = document.querySelectorAll("body > section");
		for (var i = 0; i < slides.length; i++) {
			var slide = slides[i];
			var y = slide.getBoundingClientRect().y;
			if (y < 1 && y > -1) {
				var hash = slide.id;
				webslides.currentSlide.saveState(webslides.currentState);
				webslides.currentSlide = webslides.getSlide(hash);
				webslides.currentSlide.restoreState();
				history.pushState(null, document.title+" @ "+hash, "#"+hash);
				break;
			}
		}
	}

	/* UI Helper */
	function fullscreen() {
		var e = document.documentElement;
		var rfs = e.requestFullscreen ||
			e.webkitRequestFullScreen ||
			e.mozRequestFullScreen ||
			e.msRequestFullscreen;
		var efs = document.exitFullscreen ||
			document.webkitExitFullscreen ||
			document.msExitFullScreen;
		var fse = document.fullscreenElement ||
		          document.webkitFullscreenElement ||
		          document.mozFullscreenElement ||
		          document.msFullscreenElement ;
		if (fse && efs) {
			efs.apply(document);
			resnap();
		} else if (rfs) {
			rfs.apply(e);
			resnap();
		}
	}

	function handleKey(e) {
		if (e.key=="Backspace" || e.key == "ArrowUp" || e.key == "ArrowLeft" || e.key == "PageUp" || (e.key==" " && e.shiftKey)) {
			e.preventDefault();
			prev();
		} else if (e.key==" " || e.key == "ArrowDown" || e.key == "ArrowRight" || e.key == "PageDown") {
			e.preventDefault();
			next();
		} else if (e.key=="f") {
			fullscreen();
		}
	}

	/* Events */

	document.documentElement.addEventListener("keydown", handleKey);
	window.addEventListener("resize", resnap);
	document.addEventListener("scroll", updateURLFromScroll);

	/* Init */
	addSlideNumbers();
	initSlideTree();
	generateStateStyle();
	initCurrentSlide();
	resnap();

	/* Navigation API setup */
	webslides.next = next;
	webslides.prev = prev;
	webslides.nextSlide = nextSlide;
	webslides.prevSlide = prevSlide;
	webslides.fullscreen = fullscreen

	/* UI Setup */
	if (webslides.options.onScreenNav) {
		var nav_elm = document.createElement("div");
		nav_elm.id= "nav_btns";
		nav_elm.innerHTML = "<button onclick='webslides.prev()'><svg viewBox='0 0 10 10' width='16'><path fill='currentColor' d='M0,10 5,0 10,10z'/></svg></button><button onclick='webslides.next()'><svg viewBox='0 0 10 10' width='16'><path fill='currentColor' d='M0,0 5,10 10,0z'/></svg></button><button onclick='webslides.fullscreen()'><svg viewBox='0 0 10 10' width='16'><path fill='currentColor' d='M0,0 4,0 4,1 1,1 1,4 0,4z'/><path fill='currentColor' d='M10,0 6,0 6,1 9,1 9,4 10,4z'/><path fill='currentColor' d='M0,10 4,10 4,9 1,9 1,6 0,6z'/><path fill='currentColor' d='M10,10 6,10 6,9 9,9 9,6 10,6z'/><path fill='currentColor' d='M1,0 5,5 0,1z'/><path fill='currentColor' d='M9,0 5,5 10,1z'/><path fill='currentColor' d='M1,10 5,5 0,9z'/><path fill='currentColor' d='M9,10 5,5 10,9z'/></svg></button>";
		document.body.append(nav_elm);
	}
});
