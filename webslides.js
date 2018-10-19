"use strict";

var webslides = {
	// take anchor into account
	currentSlide : null,
	state : null
};

(function() {
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

	function generateStateStyle() {
		var states = new Set();
		var es = document.querySelectorAll("[data-states]");
		es.forEach(function(e) {
			(e.getAttribute("data-states") || "").split(" ").forEach(function(state) {
				states.add(state);
			});
		});
		var displays = new Set();
		var es = document.querySelectorAll("[data-visible-as]");
		es.forEach(function(e) {
			displays.add(e.getAttribute("data-visible-as"));
		});
		var styles = "";
		states.forEach(function(s) {
			styles += ".in-"+s+" [data-hidden-in~=\""+s+"\"] { display: none; }\n";
			styles += ".from-"+s+" [data-hidden-from~=\""+s+"\"] { display: none; }\n";
			styles += ".in-"+s+" [data-visible-in~=\""+s+"\"] { display: var(--display-as, inline); }\n";
			styles += ".from-"+s+" [data-visible-from~=\""+s+"\"] { display: var(--display-as, inline); }\n";

		});
		displays.forEach(function(d) {
			styles += "[data-visible-as=\""+d+"\"] { --display-as: "+d+"; }\n";
		});
		var style_elm = document.createElement("style");
		style_elm.innerHTML = styles;
		document.head.append(style_elm)
	}

	function next() {
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
		if (webslides.currentSlide.nextElementSibling) {
			webslides.state = null;
			var states = (webslides.currentSlide.getAttribute("data-states") ||"").split(" ");
			clearInState(webslides.currentSlide, states);
			webslides.currentSlide = webslides.currentSlide.nextElementSibling;
			history.pushState(1, document.title, "#"+webslides.currentSlide.id);
			webslides.currentSlide.scrollIntoView();
		}
	}

	function prev() {
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
			history.pushState(1, document.title, "#"+webslides.currentSlide.id);

		}
		webslides.currentSlide.scrollIntoView();
	}

	function handleKey(e) {
		if (e.key=="Backspace" || e.key == "ArrowUp" || (e.key==" " && e.shiftKey)) {
			e.preventDefault();
			prev();
		} else if (e.key==" " || e.key == "ArrowDown") {
			e.preventDefault();
			next();
		}
	}
	function resnap() {
		webslides.currentSlide.scrollIntoView();
	}
	function addSlideNumbers() {
		var slides = document.querySelectorAll("body > section");
		for (var i = 0; i < slides.length; i++) {
			if (!slides[i].id) {
				slides[i].id="s"+i;
				console.warn("Side number "+i+" does not have an id. Autogenerating one. Manually add an id to be able to link to this slide when javascript is off.");
			}
		}
	}

	function initCurrentSlide() {
		var anchor = document.URL.replace(/^[^#]*#?/, "");
		if (anchor) {
			webslides.currentSlide = document.querySelector("body > section#"+anchor);
		} else {
			webslides.currentSlide = document.querySelector("body > section:first-of-type");
		}
	}

	document.body.addEventListener("keydown", handleKey);
	document.body.style="overflow: hidden";
	window.addEventListener("resize", resnap);

	generateStateStyle();

	addSlideNumbers();
	initCurrentSlide();
	resnap();
})();

