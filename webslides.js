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
	/* Document preparation */
	function createNameTree(name) {
		var tree = [];
		var self = {
			_dbg_tree: tree,
			_dbg_name: name,
			name: function() { return name; },
			addChild: function(name, opt_constructor) {
				var create = opt_constructor || createNameTree;
				var child = self.getChild(name)
				if (!child) {
					child = create(name);
					tree.push(child);
				}
				return child;
			},
			forEach: function(f) { tree.forEach(f); },
			childAfter: function (current) {
				if (current) {
					var i = tree.findIndex(function(e) {
						return e.name() == current.name();
					});
					return tree[i+1];
				} else {
					return tree[0];
				}
			},
			getChild: function(name) {
				return tree.find(function(e) {
					return e.name() == name;
				});
			},
			childBefore: function (current) {
				var i = tree.findIndex(function(e) {
					return e.name() == current.name();
				});
				return tree[i-1];
			},
			lastChild: function () {
				return tree[tree.length-1];
			},
			fullPaths: function() {
				return [name];
			},
		}
		return self;
	}
	function createSlide(name) {
		var self = createNameTree(name);

		/* State Management */
		function slideElement() {
			return document.querySelector(`#${name}`);
		}
		self.clearActiveState = function(state) {
			if (state) {
				state.fullPaths().forEach( function(name) {
					slideElement().classList.remove("in-"+name);
					slideElement().classList.remove("from-"+name);
				});
			}
		}
		self.clearActiveInState = function(state) {
			if (state) {
				state.fullPaths().forEach( function(name) {
					slideElement().classList.remove("in-"+name);
				});
			}
		}
		self.clearStates = function() {
			var toRemove = new Set();
			slideElement().classList.forEach( function(c) {
				if (c.startsWith("from-") ||
					c.startsWith("in-")) {
					toRemove.add(c);
				}
			});
			toRemove.forEach( function(c) {
				slideElement().classList.remove(c);
			});
		}
		self.setInState = function(state) {
			if (state) {
				state.fullPaths().forEach( function(name) {
					slideElement().classList.add("in-"+name);
				});
			}
		}
		self.setFromStates = function(opt_states) {
			var states = opt_states || self;
			states.forEach(function(state) {
				state.fullPaths().forEach( function(name) {
					slideElement().classList.add("from-"+name);
				});
			});
		}
		var savedState = null;
		self.saveState = function(state) {
			savedState = state;
		}
		self.restoreState = function() {
			webslides.currentState = savedState;
			if (savedState) {
				self.clearStates();
				self.setInState(savedState);
				for (var s = savedState; s; s = webslides.currentSlide.childBefore(s)) {
					self.setFromStates([s]);
				}
			}
		}

		/* UI */
		self.scrollIntoView = function() {
			slideElement().scrollIntoView();
		}

		return self;
	}


	function initSlideTree() {
		var slideTree = createNameTree("root");

		/* Set up Slide Tree APIs*/
		webslides.forEach = slideTree.forEach;
		webslides.getSlide = slideTree.getChild;
		webslides.slideBefore = slideTree.childBefore;
		webslides.slideAfter = slideTree.childAfter;

		/* Initialize the Slide Tree */
		var slideElements = document.querySelectorAll("body > section");
		slideElements.forEach(function(se) {
			var s = slideTree.addChild(se.id, createSlide);
			var dataStates = se.getAttribute("data-states");
			if (dataStates) {
				dataStates.split(" ").forEach(function(name) {
					s.addChild(name);
				});
			}
		});
	}

	function generateStateStyle() {
		var statesNames = new Set();
		webslides.forEach(function(slide) {
			slide.forEach(function(state) {
				state.fullPaths().forEach(function(name) {
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

		var next = webslides.currentSlide.childAfter(webslides.currentState);
		if (next) {
			webslides.currentSlide.clearActiveInState(webslides.currentState);
			webslides.currentState = next;
			webslides.currentSlide.setFromStates([webslides.currentState]);
			webslides.currentSlide.setInState(webslides.currentState);

		} else {
			nextSlide();
		}
	}

	function nextSlide() {
		var next = webslides.slideAfter(webslides.currentSlide);
		if (next)  {
			if (webslides.currentSlide) {
				webslides.currentSlide.saveState(webslides.currentState);
				webslides.currentState = null;

				webslides.currentSlide.clearStates();
				webslides.currentSlide.setFromStates();
			}

			webslides.currentSlide = next;
			webslides.currentSlide.clearStates();
			var hash = webslides.currentSlide.name();
			history.pushState(null, document.title+" @ "+hash, "#"+hash);
			resnap();
		}
	}

	function prev() {
		document.documentElement.classList.add("uses-script");
		if (webslides.currentState) {
			webslides.currentSlide.clearActiveState(webslides.currentState);
			var prev = webslides.currentSlide.childBefore(webslides.currentState);
			if (prev) {
				webslides.currentSlide.setFromStates([prev]);
				webslides.currentSlide.setInState(prev);
			}
			webslides.currentState = prev;
		} else {
			prevSlide();
		}
	}

	function prevSlide() {
		var prev = webslides.slideBefore(webslides.currentSlide);
		if (prev) {
			webslides.currentSlide.saveState(webslides.currentState);
			webslides.currentSlide.clearStates();

			webslides.currentSlide = prev;
			webslides.currentSlide.setFromStates();
			webslides.currentState = webslides.currentSlide.lastChild();
			if (webslides.currentState) {
				webslides.currentSlide.setInState(webslides.currentState );
			}
			var hash = webslides.currentSlide.name();
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
		nextSlide();
		if (webslides.getSlide(anchor)) {
			while (anchor != webslides.currentSlide.name()) {
				nextSlide();
			}
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
