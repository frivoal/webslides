/* MIT License

Copyright 2018 Florian Rivoal

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
	state : null,
	slides : null,
	options : {
		onScreenNav : true,
		verboseLog : false,
	}
};

window.addEventListener("DOMContentLoaded", function() {
	/* State Management */
	function clearActiveState( element, state ) {
		element.classList.remove("in-"+state);
		element.classList.remove("from-"+state);
	}

	function clearActiveInState( element, state ) {
		element.classList.remove("in-"+state);
	}

	function setInState( element, state ) {
		element.classList.add("in-" + state);
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
		states.forEach(function(state) {
			element.classList.add("from-" + state);
		});
	}

	/* Document preparation */
	function createSlide(elem) {
		var states = [];
		var self = {
			states: states,
			appendState: function(state, option) {
				if (state == "print") {
						console.warn(`Slide #${elem.id}: 'print' is a reserved state name.`);
				}
				if (option instanceof Object &&
				    option.implicit) {
					if (!states.includes(state)) {
						states.push(state);
						if (webslides.options.verboseLog){
							console.log(`Slide #${elem.id}: '${state}' state declared implicitely.`);
						}
					}
				} else {
					if (states.includes(state)) {
						console.warn(`Slide #${elem.id}: '${state}' state declared multiple times.`);
					} else {
						states.push(state);
					}
				}
			},
			appendStates: function(states, option){
				var that = this;
				if (states) {
					states.split(" ").forEach(function(state) {
						that.appendState(state, option);
					});
				}
			},
			stateNames: function () {
				return states;
			},
			lastState: function () {
				return states[states.length-1];
			},
			stateAfter: function (currentState) {
				if (currentState) {
					var i = states.indexOf(currentState);
					if (i != -1) {
						return states[i+1];
					}
				} else {
					return states[0];
				}
			},
			stateBefore: function (currentState) {
				var i = states.indexOf(currentState);
				return states[i-1];
			}
		}
		return self;
	}

	function createSlideTree() {
		var tree = new Map();
		var self = {
			all: tree,
			forEachSlide: function(f) { tree.forEach(f); },
			getSlide: function(s) { return tree.get(s) },
		};
		var slideElements = document.querySelectorAll("body > section");
		slideElements.forEach(function(se) {
			var s = createSlide(se);
			tree.set(se.id, s);
			var dataStates = se.getAttribute("data-states");
			s.appendStates(dataStates);
			se.querySelectorAll("[data-visible-from]", "[data-visible-in]").forEach(function(e) {
				var impliedStates = "" + e.getAttribute("data-visible-from") || "" + e.getAttribute("data-visible-in") || "";
				s.appendStates(impliedStates, {implicit: true});
			});
		});
		return self;
	}
	function generateStateStyle() {
		var states = new Set();
		webslides.slides.forEachSlide(function(s) {
			s.stateNames().forEach(function(state) {
				states.add(state);
			});
		});
		var styles = "";
		states.forEach(function(s) {
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
				console.warn("Side number "+i+" does not have an id. Autogenerating one. Manually add an id to be able to link to this slide when javascript is off.");
			}
		}
	}


	/* Navigation */
	function next() {
		document.documentElement.classList.add("uses-script");

		var next = webslides.slides.getSlide(webslides.currentSlide.id).stateAfter(webslides.state);
		if (next) {
			clearActiveInState(webslides.currentSlide, webslides.state);
			webslides.state = next;
			setFromStates(webslides.currentSlide, [webslides.state]);
			setInState(webslides.currentSlide, webslides.state);

		} else {
			nextSlide();
		}
	}

	function nextSlide() {
		if (webslides.currentSlide.nextElementSibling && webslides.currentSlide.nextElementSibling.localName == "section" )  {
			webslides.state = null;
			clearStates(webslides.currentSlide);
			setFromStates(webslides.currentSlide, webslides.slides.getSlide(webslides.currentSlide.id).stateNames());

			webslides.currentSlide = webslides.currentSlide.nextElementSibling;
			clearStates(webslides.currentSlide);
			var hash = webslides.currentSlide.id;
			history.pushState(null, document.title+" @ "+hash, "#"+hash);
			resnap();
		}
	}

	function prev() {
		document.documentElement.classList.add("uses-script");
		if (webslides.state) {
			clearActiveState(webslides.currentSlide, webslides.state);
			var prev = webslides.slides.getSlide(webslides.currentSlide.id).stateBefore(webslides.state);
			webslides.state = prev;
			if (prev) {
				setFromStates(webslides.currentSlide, [prev]);
				setInState(webslides.currentSlide, prev);
			}
		} else {
			prevSlide();
		}
	}

	function prevSlide() {
		if (webslides.currentSlide.previousElementSibling) {
			clearStates(webslides.currentSlide);

			webslides.currentSlide = webslides.currentSlide.previousElementSibling;
			setFromStates(webslides.currentSlide, webslides.slides.getSlide(webslides.currentSlide.id).stateNames());
			webslides.state = webslides.slides.getSlide(webslides.currentSlide.id).lastState();
			if (webslides.state) {
				setInState(webslides.currentSlide, webslides.state );
			}
			var hash = webslides.currentSlide.id;
			history.pushState(null, document.title+" @ "+hash, "#"+hash);

		}
		resnap();
	}

	/* Consistency of URL and position */
	function resnap() {
		webslides.currentSlide.scrollIntoView();
	}

	function initCurrentSlide() {
		var anchor = document.URL.replace(/^[^#]*#?/, "");
		if (anchor) {
			webslides.currentSlide = document.querySelector("body > section#"+anchor);
			webslides.state = null;
		} else {
			webslides.currentSlide = document.querySelector("body > section:first-of-type");
			webslides.state = null;
		}
	}

	function updateURLFromScroll() {
		var slides = document.querySelectorAll("body > section");
		for (var i = 0; i < slides.length; i++) {
			var slide = slides[i];
			var y = slide.getBoundingClientRect().y;
			if (y < 1 && y > -1) {
				var hash = slide.id;
				webslides.currentSlide = slide;
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
	webslides.slides = createSlideTree();
	generateStateStyle();
	initCurrentSlide();
	resnap();

	/* API setup */
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
