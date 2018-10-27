"use strict";

var webslides = {
	// take anchor into account
	currentSlide : null,
	state : null,
	options : {
		onScreenNav : true,
	}
};

window.addEventListener("DOMContentLoaded", function() {
	/* State Management */
	function clearInState( element, states) {
		states.forEach(function(state) {
			element.classList.remove("in-" + state);
		});
	}

	function setInState( element, state) {
		element.classList.add("in-" + state);
	}

	function clearFromState( element, states) {
		states.forEach(function(state) {
			element.classList.remove("from-" + state);
		});
	}

	function setFromState( element, states) {
		states.forEach(function(state) {
			element.classList.add("from-" + state);
		});
	}

	/* Document preparation */
	function generateStateStyle() {
		var states = new Set();
		var es = document.querySelectorAll("[data-states]");
		es.forEach(function(e) {
			(e.getAttribute("data-states") || "").split(" ").forEach(function(state) {
				states.add(state);
			});
		});
		var styles = "";
		states.forEach(function(s) {
			styles += "body.uses-script .in-"+s+" [data-hidden-in~=\""+s+"\"] { visibility: hidden; }\n";
			styles += "body.uses-script .from-"+s+" [data-hidden-from~=\""+s+"\"] { visibility: hidden; }\n";
			styles += "body.uses-script .in-"+s+" [data-visible-in~=\""+s+"\"] { visibility: visible; }\n";
			styles += "body.uses-script .from-"+s+" [data-visible-from~=\""+s+"\"] { visibility: visible; }\n";

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
		document.body.classList.add("uses-script");
		var states_string = webslides.currentSlide.getAttribute("data-states") || "";
		if (states_string)  {
			var states = states_string.split(" ");
			var i = states.indexOf(webslides.state) + 1;
			if (i == states.length) {
				nextSlide();
			} else {
				webslides.state = states[i];
				clearInState(webslides.currentSlide, states);
				setInState(webslides.currentSlide, webslides.state);
				setFromState(webslides.currentSlide, states.slice(0,i+1));
			}
		} else {
			nextSlide();
		}
	}

	function nextSlide() {
		if (webslides.currentSlide.nextElementSibling && webslides.currentSlide.nextElementSibling.localName == "section" )  {
			webslides.state = null;
			var states = (webslides.currentSlide.getAttribute("data-states") ||"").split(" ");
			clearInState(webslides.currentSlide, states);

			webslides.currentSlide = webslides.currentSlide.nextElementSibling;
			states = (webslides.currentSlide.getAttribute("data-states") ||"").split(" ");
			clearInState(webslides.currentSlide, states);
			clearFromState(webslides.currentSlide, states);
			var hash = webslides.currentSlide.id;
			history.pushState(null, document.title+" @ "+hash, "#"+hash);
			resnap();
		}
	}

	function prev() {
		document.body.classList.add("uses-script");
		var states_string = webslides.currentSlide.getAttribute("data-states") || ""; 
		if (states_string)  {
			var states = states_string.split(" ");
			var i = states.indexOf(webslides.state);
			if (i == -1) {
				prevSlide();
			} else {
				i = i - 1;
				webslides.state = states[i] || null;
				if (webslides.state) {
					clearInState(webslides.currentSlide, states);
					clearFromState(webslides.currentSlide, states);
					setInState(webslides.currentSlide, webslides.state);
					setFromState(webslides.currentSlide, states.slice(0,i+1))
				} else {
					clearInState(webslides.currentSlide, states);
					clearFromState(webslides.currentSlide, states);
				}
			}
		} else {
			prevSlide();
		}
	}
	function prevSlide() {
		if (webslides.currentSlide.previousElementSibling) {
			webslides.currentSlide = webslides.currentSlide.previousElementSibling;
			var states_string = webslides.currentSlide.getAttribute("data-states") || "";
			if (states_string)  {
				var states = states_string.split(" ");
				webslides.state = states[states.length - 1];
				setInState(webslides.currentSlide, webslides.state);
				setFromState(webslides.currentSlide, states);
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
		if (e.key=="Backspace" || e.key == "ArrowUp" || e.key == "ArrowLeft" || (e.key==" " && e.shiftKey)) {
			e.preventDefault();
			prev();
		} else if (e.key==" " || e.key == "ArrowDown" || e.key == "ArrowRight") {
			e.preventDefault();
			next();
		} else if (e.key=="f") {
			fullscreen();
		}
	}

	/* Events */

	document.body.addEventListener("keydown", handleKey);
	window.addEventListener("resize", resnap);
	document.addEventListener("scroll", updateURLFromScroll);

	/* Init */
	addSlideNumbers();
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
