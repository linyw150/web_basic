/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A component handler interface using the revealing module design pattern.
 * More details on this design pattern here:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @author Jason Mayes.
 */
/* exported componentHandler */
var componentHandler = function () {
  'use strict';
  /** @type {!Array<componentHandler.ComponentConfig>} */
  var registeredComponents_ = [];
  /** @type {!Array<componentHandler.Component>} */
  var createdComponents_ = [];
  var downgradeMethod_ = 'mdlDowngrade_';
  var componentConfigProperty_ = 'mdlComponentConfigInternal_';
  /**
     * Searches registered components for a class we are interested in using.
     * Optionally replaces a match with passed object if specified.
     * @param {string} name The name of a class we want to use.
     * @param {componentHandler.ComponentConfig=} optReplace Optional object to replace match with.
     * @return {!Object|boolean}
     * @private
     */
  function findRegisteredClass_(name, optReplace) {
    for (var i = 0; i < registeredComponents_.length; i++) {
      if (registeredComponents_[i].className === name) {
        if (optReplace !== undefined) {
          registeredComponents_[i] = optReplace;
        }
        return registeredComponents_[i];
      }
    }
    return false;
  }
  /**
     * Returns an array of the classNames of the upgraded classes on the element.
     * @param {!HTMLElement} element The element to fetch data from.
     * @return {!Array<string>}
     * @private
     */
  function getUpgradedListOfElement_(element) {
    var dataUpgraded = element.getAttribute('data-upgraded');
    // Use `['']` as default value to conform the `,name,name...` style.
    return dataUpgraded === null ? [''] : dataUpgraded.split(',');
  }
  /**
     * Returns true if the given element has already been upgraded for the given
     * class.
     * @param {!HTMLElement} element The element we want to check.
     * @param {string} jsClass The class to check for.
     * @return boolean
     * @private
     */
  function isElementUpgraded_(element, jsClass) {
    var upgradedList = getUpgradedListOfElement_(element);
    return upgradedList.indexOf(jsClass) !== -1;
  }
  /**
     * Searches existing DOM for elements of our component type and upgrades them
     * if they have not already been upgraded.
     * @param {string=} optJsClass the programatic name of the element class we
     * need to create a new instance of.
     * @param {string=} optCssClass the name of the CSS class elements of this
     * type will have.
     */
  function upgradeDomInternal(optJsClass, optCssClass) {
    if (optJsClass === undefined && optCssClass === undefined) {
      for (var i = 0; i < registeredComponents_.length; i++) {
        upgradeDomInternal(registeredComponents_[i].className, registeredComponents_[i].cssClass);
      }
    } else {
      var jsClass = optJsClass;
      if (optCssClass === undefined) {
        var registeredClass = findRegisteredClass_(jsClass);
        if (registeredClass) {
          optCssClass = registeredClass.cssClass;
        }
      }
      var elements = document.querySelectorAll('.' + optCssClass);
      for (var n = 0; n < elements.length; n++) {
        upgradeElementInternal(elements[n], jsClass);
      }
    }
  }
  /**
     * Upgrades a specific element rather than all in the DOM.
     * @param {!HTMLElement} element The element we wish to upgrade.
     * @param {string=} optJsClass Optional name of the class we want to upgrade
     * the element to.
     */
  function upgradeElementInternal(element, optJsClass) {
    // Verify argument type.
    if (!(typeof element === 'object' && element instanceof Element)) {
      throw new Error('Invalid argument provided to upgrade MDL element.');
    }
    var upgradedList = getUpgradedListOfElement_(element);
    var classesToUpgrade = [];
    // If jsClass is not provided scan the registered components to find the
    // ones matching the element's CSS classList.
    if (!optJsClass) {
      var classList = element.classList;
      registeredComponents_.forEach(function (component) {
        // Match CSS & Not to be upgraded & Not upgraded.
        if (classList.contains(component.cssClass) && classesToUpgrade.indexOf(component) === -1 && !isElementUpgraded_(element, component.className)) {
          classesToUpgrade.push(component);
        }
      });
    } else if (!isElementUpgraded_(element, optJsClass)) {
      classesToUpgrade.push(findRegisteredClass_(optJsClass));
    }
    // Upgrade the element for each classes.
    for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
      registeredClass = classesToUpgrade[i];
      if (registeredClass) {
        // Mark element as upgraded.
        upgradedList.push(registeredClass.className);
        element.setAttribute('data-upgraded', upgradedList.join(','));
        var instance = new registeredClass.classConstructor(element);
        instance[componentConfigProperty_] = registeredClass;
        createdComponents_.push(instance);
        // Call any callbacks the user has registered with this component type.
        for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) {
          registeredClass.callbacks[j](element);
        }
        if (registeredClass.widget) {
          // Assign per element instance for control over API
          element[registeredClass.className] = instance;
        }
      } else {
        throw new Error('Unable to find a registered component for the given class.');
      }
      var ev = document.createEvent('Events');
      ev.initEvent('mdl-componentupgraded', true, true);
      element.dispatchEvent(ev);
    }
  }
  /**
     * Upgrades a specific list of elements rather than all in the DOM.
     * @param {!HTMLElement|!Array<!HTMLElement>|!NodeList|!HTMLCollection} elements
     * The elements we wish to upgrade.
     */
  function upgradeElementsInternal(elements) {
    if (!Array.isArray(elements)) {
      if (typeof elements.item === 'function') {
        elements = Array.prototype.slice.call(elements);
      } else {
        elements = [elements];
      }
    }
    for (var i = 0, n = elements.length, element; i < n; i++) {
      element = elements[i];
      if (element instanceof HTMLElement) {
        if (element.children.length > 0) {
          upgradeElementsInternal(element.children);
        }
        upgradeElementInternal(element);
      }
    }
  }
  /**
     * Registers a class for future use and attempts to upgrade existing DOM.
     * @param {{constructor: !Function, classAsString: string, cssClass: string, widget: string}} config
     */
  function registerInternal(config) {
    var newConfig = {
      'classConstructor': config.constructor,
      'className': config.classAsString,
      'cssClass': config.cssClass,
      'widget': config.widget === undefined ? true : config.widget,
      'callbacks': []
    };
    registeredComponents_.forEach(function (item) {
      if (item.cssClass === newConfig.cssClass) {
        throw new Error('The provided cssClass has already been registered.');
      }
      if (item.className === newConfig.className) {
        throw new Error('The provided className has already been registered');
      }
    });
    if (config.constructor.prototype.hasOwnProperty(componentConfigProperty_)) {
      throw new Error('MDL component classes must not have ' + componentConfigProperty_ + ' defined as a property.');
    }
    var found = findRegisteredClass_(config.classAsString, newConfig);
    if (!found) {
      registeredComponents_.push(newConfig);
    }
  }
  /**
     * Allows user to be alerted to any upgrades that are performed for a given
     * component type
     * @param {string} jsClass The class name of the MDL component we wish
     * to hook into for any upgrades performed.
     * @param {function(!HTMLElement)} callback The function to call upon an
     * upgrade. This function should expect 1 parameter - the HTMLElement which
     * got upgraded.
     */
  function registerUpgradedCallbackInternal(jsClass, callback) {
    var regClass = findRegisteredClass_(jsClass);
    if (regClass) {
      regClass.callbacks.push(callback);
    }
  }
  /**
     * Upgrades all registered components found in the current DOM. This is
     * automatically called on window load.
     */
  function upgradeAllRegisteredInternal() {
    for (var n = 0; n < registeredComponents_.length; n++) {
      upgradeDomInternal(registeredComponents_[n].className);
    }
  }
  /**
     * Finds a created component by a given DOM node.
     *
     * @param {!Node} node
     * @return {*}
     */
  function findCreatedComponentByNodeInternal(node) {
    for (var n = 0; n < createdComponents_.length; n++) {
      var component = createdComponents_[n];
      if (component.element_ === node) {
        return component;
      }
    }
  }
  /**
     * Check the component for the downgrade method.
     * Execute if found.
     * Remove component from createdComponents list.
     *
     * @param {*} component
     */
  function deconstructComponentInternal(component) {
    if (component && component[componentConfigProperty_].classConstructor.prototype.hasOwnProperty(downgradeMethod_)) {
      component[downgradeMethod_]();
      var componentIndex = createdComponents_.indexOf(component);
      createdComponents_.splice(componentIndex, 1);
      var upgrades = component.element_.getAttribute('data-upgraded').split(',');
      var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
      upgrades.splice(componentPlace, 1);
      component.element_.setAttribute('data-upgraded', upgrades.join(','));
      var ev = document.createEvent('Events');
      ev.initEvent('mdl-componentdowngraded', true, true);
      component.element_.dispatchEvent(ev);
    }
  }
  /**
     * Downgrade either a given node, an array of nodes, or a NodeList.
     *
     * @param {!Node|!Array<!Node>|!NodeList} nodes
     */
  function downgradeNodesInternal(nodes) {
    var downgradeNode = function (node) {
      deconstructComponentInternal(findCreatedComponentByNodeInternal(node));
    };
    if (nodes instanceof Array || nodes instanceof NodeList) {
      for (var n = 0; n < nodes.length; n++) {
        downgradeNode(nodes[n]);
      }
    } else if (nodes instanceof Node) {
      downgradeNode(nodes);
    } else {
      throw new Error('Invalid argument provided to downgrade MDL nodes.');
    }
  }
  function findSiblingInternal(elem) {
    var nodes = [];
    //定义一个数组，用来存o的兄弟元素 
    var prev = elem.previousSibling;
    while (prev) {
      //先取o的哥哥们 判断有没有上一个哥哥元素，如果有则往下执行 p表示previousSibling 
      if (prev.nodeType === 1) {
        nodes.push(prev);
      }
      prev = prev.previousSibling;
    }
    nodes.reverse();
    //把顺序反转一下 这样元素的顺序就是按先后的了 
    var next = elem.nextSibling;
    //再取o的弟弟 
    while (next) {
      //判断有没有下一个弟弟结点 n是nextSibling的意思 
      if (next.nodeType === 1) {
        nodes.push(next);
      }
      next = next.nextSibling;
    }
    return nodes  //最后按从老大到老小的顺序，把这一组元素返回 
;
  }
  // Now return the functions that should be made public with their publicly
  // facing names...
  return {
    upgradeDom: upgradeDomInternal,
    upgradeElement: upgradeElementInternal,
    upgradeElements: upgradeElementsInternal,
    upgradeAllRegistered: upgradeAllRegisteredInternal,
    registerUpgradedCallback: registerUpgradedCallbackInternal,
    register: registerInternal,
    findSibling: findSiblingInternal,
    downgradeElements: downgradeNodesInternal
  };
}();
window.addEventListener('load', function () {
  'use strict';
  /**
     * Performs a "Cutting the mustard" test. If the browser supports the features
     * tested, adds a mdl-js class to the <html> element. It then upgrades all MDL
     * components requiring JavaScript.
     */
  if ('classList' in document.createElement('div') && 'querySelector' in document && 'addEventListener' in window && Array.prototype.forEach) {
    document.documentElement.classList.add('mdl-js');
    componentHandler.upgradeAllRegistered();
  } else {
    componentHandler.upgradeElement = componentHandler.register = function () {
    };
  }
});
/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 * @typedef {{
 *   constructor: !Function,
 *   className: string,
 *   cssClass: string,
 *   widget: string,
 *   callbacks: !Array<function(!HTMLElement)>
 * }}
 */
componentHandler.ComponentConfig;
// jshint ignore:line
/**
 * Created component (i.e., upgraded element) type as managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 * @typedef {{
 *   element_: !HTMLElement,
 *   className: string,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: string
 * }}
 */
componentHandler.Component;  // jshint ignore:line

(function() {
    if (!("classList" in document.documentElement)) {
        Object.defineProperty(HTMLElement.prototype, 'classList', {
            get: function() {
                var self = this;

                function update(fn) {
                    return function(value) {
                        var classes = self.className.split(/\s+/g),
                            index = classes.indexOf(value);

                        fn(classes, index, value);
                        self.className = classes.join(" ");
                    }
                }

                return {
                    add: update(function(classes, index, value) {
                        if (!~index) classes.push(value);
                    }),

                    remove: update(function(classes, index) {
                        if (~index) classes.splice(index, 1);
                    }),

                    toggle: update(function(classes, index, value) {
                        if (~index)
                            classes.splice(index, 1);
                        else
                            classes.push(value);
                    }),

                    contains: function(value) {
                        return !!~self.className.split(/\s+/g).indexOf(value);
                    },

                    item: function(i) {
                        return self.className.split(/\s+/g)[i] || null;
                    }
                };
            }
        });
    }
}());

// Source: https://github.com/darius/requestAnimationFrame/blob/master/requestAnimationFrame.js
// Adapted from https://gist.github.com/paulirish/1579671 which derived from
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller.
// Fixes from Paul Irish, Tino Zijdel, Andrew Mao, Klemen Slavič, Darius Bacon
// MIT license
(function () {
  'use strict';
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }
  var vendors = [
    'webkit',
    'moz'
  ];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
}());
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Spinner MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 * @constructor
 */
function MaterialSpinner(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialSpinner.prototype.Constant_ = { MDL_SPINNER_LAYER_COUNT: 4 };
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialSpinner.prototype.CssClasses_ = {
  MDL_SPINNER_LAYER: 'spinner-layer',
  MDL_SPINNER_CIRCLE_CLIPPER: 'spinner-circle-clipper',
  MDL_SPINNER_CIRCLE: 'spinner-circle',
  MDL_SPINNER_GAP_PATCH: 'spinner-gap-patch',
  MDL_SPINNER_LEFT: 'spinner-left',
  MDL_SPINNER_RIGHT: 'spinner-right'
};
/**
* Auxiliary method to create a spinner layer.
*/
MaterialSpinner.prototype.createLayer = function (index) {
  'use strict';
  var layer = document.createElement('div');
  layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
  layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + '-' + index);
  var leftClipper = document.createElement('div');
  leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
  leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
  var gapPatch = document.createElement('div');
  gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
  var rightClipper = document.createElement('div');
  rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
  rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
  var circleOwners = [
    leftClipper,
    gapPatch,
    rightClipper
  ];
  for (var i = 0; i < circleOwners.length; i++) {
    var circle = document.createElement('div');
    circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
    circleOwners[i].appendChild(circle);
  }
  layer.appendChild(leftClipper);
  layer.appendChild(gapPatch);
  layer.appendChild(rightClipper);
  this.element_.appendChild(layer);
};
/**
* Stops the spinner animation.
* Public method for users who need to stop the spinner for any reason.
* @public
*/
MaterialSpinner.prototype.stop = function () {
  'use strict';
  this.element_.classList.remove('is-active');
};
/**
* Starts the spinner animation.
* Public method for users who need to manually start the spinner for any reason
* (instead of just adding the 'is-active' class to their markup).
* @public
*/
MaterialSpinner.prototype.start = function () {
  'use strict';
  this.element_.classList.add('is-active');
};
/**
 * Initialize element.
 */
MaterialSpinner.prototype.init = function () {
  'use strict';
  if (this.element_) {
    for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) {
      this.createLayer(i);
    }
    this.element_.classList.add('is-upgraded');
  }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialSpinner,
  classAsString: 'MaterialSpinner',
  cssClass: 'ulite-js-spinner',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Progress MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialProgress(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialProgress.prototype.Constant_ = {};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialProgress.prototype.CssClasses_ = { INDETERMINATE_CLASS: 'mdl-progress__indeterminate' };
MaterialProgress.prototype.setProgress = function (p) {
  'use strict';
  if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) {
    return;
  }
  this.progressbar_.style.width = p + '%';
};
MaterialProgress.prototype.setBuffer = function (p) {
  'use strict';
  this.bufferbar_.style.width = p + '%';
  this.auxbar_.style.width = 100 - p + '%';
};
/**
 * Initialize element.
 */
MaterialProgress.prototype.init = function () {
  'use strict';
  if (this.element_) {
    var el = document.createElement('div');
    el.className = 'progressbar bar bar1';
    this.element_.appendChild(el);
    this.progressbar_ = el;
    el = document.createElement('div');
    el.className = 'bufferbar bar bar2';
    this.element_.appendChild(el);
    this.bufferbar_ = el;
    el = document.createElement('div');
    el.className = 'auxbar bar bar3';
    this.element_.appendChild(el);
    this.auxbar_ = el;
    this.progressbar_.style.width = '0%';
    this.bufferbar_.style.width = '100%';
    this.auxbar_.style.width = '0%';
    this.element_.classList.add('is-upgraded');
  }
};
/*
* Downgrade the component
*/
MaterialProgress.prototype.mdlDowngrade_ = function () {
  'use strict';
  while (this.element_.firstChild) {
    this.element_.removeChild(this.element_.firstChild);
  }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialProgress,
  classAsString: 'MaterialProgress',
  cssClass: 'ulite-js-progress',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Button MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialMenu(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialMenu.prototype.Constant_ = {};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialMenu.prototype.CssClasses_ = {
  ACTIVE_CONTAINER: 'active',
  NO_ACTIVE_CONTAINER: 'no-active',
  ROOT_MENU: 'menu-vertical',
  CHILD_MENU_CONTAINER: 'menu-vertical-child',
  CHILD_MENU: '.menu-vertical-child li',
  RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  RIPPLE_CONTAINER: 'btn-ripple-container',
  RIPPLE: 'ripple'
};
/**
 * Handle blur of element.
 * @param {HTMLElement} element The instance of a button we want to blur.
 * @private
 */
MaterialMenu.prototype.blurHandler = function (event) {
  'use strict';
  if (event) {
    this.element_.blur();
  }
};
MaterialMenu.prototype.clickHandler = function (event) {
  'use strict';
  if (event) {
    var parentNode = this.element_.parentNode;
    if ($(this.element_).hasClass(this.CssClasses_.NO_ACTIVE_CONTAINER)) {
      return false;
    }
    if (parentNode.classList.contains(this.CssClasses_.ACTIVE_CONTAINER)) {
      parentNode.classList.remove(this.CssClasses_.ACTIVE_CONTAINER);
    } else {
      var parentMenu = parentNode.parentNode;
      var parentMenuRoot = $(parentMenu).parents('.' + this.CssClasses_.ROOT_MENU)[0];
      if (parentMenu.classList.contains(this.CssClasses_.CHILD_MENU_CONTAINER)) {
        var childMenus = parentMenuRoot.querySelectorAll(this.CssClasses_.CHILD_MENU);
        for (var i = childMenus.length - 1; i >= 0; i--) {
          childMenus[i].classList.remove(this.CssClasses_.ACTIVE_CONTAINER);
        }
      }
      parentNode.classList.add(this.CssClasses_.ACTIVE_CONTAINER);
      var siblings = $(parentNode).siblings('li');
      siblings.removeClass(this.CssClasses_.ACTIVE_CONTAINER);
    }
  }
};
// Public methods.
/**
 * Disable button.
 * @public
 */
MaterialMenu.prototype.disable = function () {
  'use strict';
  this.element_.disabled = true;
};
/**
 * Enable button.
 * @public
 */
MaterialMenu.prototype.enable = function () {
  'use strict';
  this.element_.disabled = false;
};
/**
 * Initialize element.
 */
MaterialMenu.prototype.init = function () {
  'use strict';
  if (this.element_) {
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      var rippleContainer = document.createElement('span');
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      this.rippleElement_ = document.createElement('span');
      this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
      rippleContainer.appendChild(this.rippleElement_);
      this.boundRippleBlurHandler = this.blurHandler.bind(this);
      this.rippleElement_.addEventListener('mouseup', this.boundRippleBlurHandler);
      this.element_.appendChild(rippleContainer);
    }
    this.boundButtonBlurHandler = this.blurHandler.bind(this);
    this.boundButtonClickHandler = this.clickHandler.bind(this);
    this.element_.addEventListener('mouseup', this.boundButtonBlurHandler);
    this.element_.addEventListener('mouseleave', this.boundButtonBlurHandler);
    this.element_.addEventListener('click', this.boundButtonClickHandler);
  }
};
/**
 * Downgrade the element.
 */
MaterialMenu.prototype.mdlDowngrade_ = function () {
  'use strict';
  if (this.rippleElement_) {
    this.rippleElement_.removeEventListener('mouseup', this.boundRippleBlurHandler);
  }
  this.element_.removeEventListener('mouseup', this.boundButtonBlurHandler);
  this.element_.removeEventListener('mouseleave', this.boundButtonBlurHandler);
  this.element_.removeEventListener('click', this.boundButtonClickHandler);
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialMenu,
  classAsString: 'MaterialMenu',
  cssClass: 'ulite-js-menu',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Button MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialButton(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialButton.prototype.Constant_ = {};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialButton.prototype.CssClasses_ = {
  RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  RIPPLE_CONTAINER: 'btn-ripple-container',
  RIPPLE: 'ripple'
};
/**
 * Handle blur of element.
 * @param {HTMLElement} element The instance of a button we want to blur.
 * @private
 */
MaterialButton.prototype.blurHandler = function (event) {
  'use strict';
  if (event) {
    this.element_.blur();
  }
};
// Public methods.
/**
 * Disable button.
 * @public
 */
MaterialButton.prototype.disable = function () {
  'use strict';
  this.element_.disabled = true;
};
/**
 * Enable button.
 * @public
 */
MaterialButton.prototype.enable = function () {
  'use strict';
  this.element_.disabled = false;
};
/**
 * Initialize element.
 */
MaterialButton.prototype.init = function () {
  'use strict';
  if (this.element_) {
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      var rippleContainer = document.createElement('span');
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      this.rippleElement_ = document.createElement('span');
      this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
      rippleContainer.appendChild(this.rippleElement_);
      this.boundRippleBlurHandler = this.blurHandler.bind(this);
      this.rippleElement_.addEventListener('mouseup', this.boundRippleBlurHandler);
      this.element_.appendChild(rippleContainer);
    }
    this.boundButtonBlurHandler = this.blurHandler.bind(this);
    this.element_.addEventListener('mouseup', this.boundButtonBlurHandler);
    this.element_.addEventListener('mouseleave', this.boundButtonBlurHandler);
  }
};
/**
 * Downgrade the element.
 */
MaterialButton.prototype.mdlDowngrade_ = function () {
  'use strict';
  if (this.rippleElement_) {
    this.rippleElement_.removeEventListener('mouseup', this.boundRippleBlurHandler);
  }
  this.element_.removeEventListener('mouseup', this.boundButtonBlurHandler);
  this.element_.removeEventListener('mouseleave', this.boundButtonBlurHandler);
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialButton,
  classAsString: 'MaterialButton',
  cssClass: 'ulite-js-btn',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Radio MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialRadio(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialRadio.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialRadio.prototype.CssClasses_ = {
  IS_FOCUSED: 'is-focused',
  IS_DISABLED: 'is-disabled',
  IS_CHECKED: 'is-checked',
  IS_UPGRADED: 'is-upgraded',
  JS_RADIO: 'ulite-js-radio',
  RADIO_BTN: 'radio-btn',
  RADIO_OUTER_CIRCLE: 'radio-outer-circle',
  RADIO_INNER_CIRCLE: 'radio-inner-circle',
  RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  RIPPLE_IGNORE_EVENTS: 'ulite-js-ripple-effect--ignore-events',
  RIPPLE_CONTAINER: 'radio-ripple-container',
  RIPPLE_CENTER: 'ulite-ripple--center',
  RIPPLE: 'ripple'
};
/**
 * Handle change of state.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRadio.prototype.onChange_ = function (event) {
  'use strict';
  // Since other radio buttons don't get change events, we need to look for
  // them to update their classes.
  var radios = document.getElementsByClassName(this.CssClasses_.JS_RADIO);
  for (var i = 0; i < radios.length; i++) {
    var button = radios[i].querySelector('.' + this.CssClasses_.RADIO_BTN);
    // Different name == different group, so no point updating those.
    if (button.getAttribute('name') === this.btnElement_.getAttribute('name')) {
      radios[i].MaterialRadio.updateClasses_();
    }
  }
};
/**
 * Handle focus.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRadio.prototype.onFocus_ = function (event) {
  'use strict';
  this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle lost focus.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRadio.prototype.onBlur_ = function (event) {
  'use strict';
  this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle mouseup.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRadio.prototype.onMouseup_ = function (event) {
  'use strict';
  this.blur_();
};
/**
 * Update classes.
 * @private
 */
MaterialRadio.prototype.updateClasses_ = function () {
  'use strict';
  this.checkDisabled();
  this.checkToggleState();
};
/**
 * Add blur.
 * @private
 */
MaterialRadio.prototype.blur_ = function (event) {
  'use strict';
  // TODO: figure out why there's a focus event being fired after our blur,
  // so that we can avoid this hack.
  window.setTimeout(function () {
    this.btnElement_.blur();
  }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
 * Check the components disabled state.
 * @public
 */
MaterialRadio.prototype.checkDisabled = function () {
  'use strict';
  if (this.btnElement_.disabled) {
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
  }
};
/**
 * Check the components toggled state.
 * @public
 */
MaterialRadio.prototype.checkToggleState = function () {
  'use strict';
  if (this.btnElement_.checked) {
    this.element_.classList.add(this.CssClasses_.IS_CHECKED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
  }
};
/**
 * Disable radio.
 * @public
 */
MaterialRadio.prototype.disable = function () {
  'use strict';
  this.btnElement_.disabled = true;
  this.updateClasses_();
};
/**
 * Enable radio.
 * @public
 */
MaterialRadio.prototype.enable = function () {
  'use strict';
  this.btnElement_.disabled = false;
  this.updateClasses_();
};
/**
 * Check radio.
 * @public
 */
MaterialRadio.prototype.check = function () {
  'use strict';
  this.btnElement_.checked = true;
  this.updateClasses_();
};
/**
 * Uncheck radio.
 * @public
 */
MaterialRadio.prototype.uncheck = function () {
  'use strict';
  this.btnElement_.checked = false;
  this.updateClasses_();
};
/**
 * Initialize element.
 */
MaterialRadio.prototype.init = function () {
  'use strict';
  if (this.element_) {
    this.btnElement_ = this.element_.querySelector('.' + this.CssClasses_.RADIO_BTN);
    var outerCircle = document.createElement('span');
    outerCircle.classList.add(this.CssClasses_.RADIO_OUTER_CIRCLE);
    var innerCircle = document.createElement('span');
    innerCircle.classList.add(this.CssClasses_.RADIO_INNER_CIRCLE);
    this.element_.appendChild(outerCircle);
    this.element_.appendChild(innerCircle);
    var rippleContainer;
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
      rippleContainer = document.createElement('span');
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_EFFECT);
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_CENTER);
      rippleContainer.addEventListener('mouseup', this.onMouseup_.bind(this));
      var ripple = document.createElement('span');
      ripple.classList.add(this.CssClasses_.RIPPLE);
      rippleContainer.appendChild(ripple);
      this.element_.appendChild(rippleContainer);
    }
    this.btnElement_.addEventListener('change', this.onChange_.bind(this));
    this.btnElement_.addEventListener('focus', this.onFocus_.bind(this));
    this.btnElement_.addEventListener('blur', this.onBlur_.bind(this));
    this.element_.addEventListener('mouseup', this.onMouseup_.bind(this));
    this.updateClasses_();
    this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
  }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialRadio,
  classAsString: 'MaterialRadio',
  cssClass: 'ulite-js-radio',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Checkbox MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialCheckbox(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialCheckbox.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialCheckbox.prototype.CssClasses_ = {
  INPUT: 'checkbox-input',
  BOX_OUTLINE: 'checkbox-box-outline',
  FOCUS_HELPER: 'checkbox-focus-helper',
  TICK_OUTLINE: 'checkbox-tick-outline',
  RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  RIPPLE_IGNORE_EVENTS: 'ulite-js-ripple-effect--ignore-events',
  RIPPLE_CONTAINER: 'checkbox-ripple-container',
  RIPPLE_CENTER: 'ulite-ripple--center',
  RIPPLE: 'ripple',
  IS_FOCUSED: 'is-focused',
  IS_DISABLED: 'is-disabled',
  IS_CHECKED: 'is-checked',
  IS_UPGRADED: 'is-upgraded'
};
/**
 * Handle change of state.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialCheckbox.prototype.onChange_ = function (event) {
  'use strict';
  this.updateClasses_();
};
/**
 * Handle focus of element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialCheckbox.prototype.onFocus_ = function (event) {
  'use strict';
  this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle lost focus of element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialCheckbox.prototype.onBlur_ = function (event) {
  'use strict';
  this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle mouseup.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialCheckbox.prototype.onMouseUp_ = function (event) {
  'use strict';
  this.blur_();
};
/**
 * Handle class updates.
 * @param {HTMLElement} button The button whose classes we should update.
 * @param {HTMLElement} label The label whose classes we should update.
 * @private
 */
MaterialCheckbox.prototype.updateClasses_ = function () {
  'use strict';
  this.checkDisabled();
  this.checkToggleState();
};
/**
 * Add blur.
 * @private
 */
MaterialCheckbox.prototype.blur_ = function (event) {
  'use strict';
  // TODO: figure out why there's a focus event being fired after our blur,
  // so that we can avoid this hack.
  window.setTimeout(function () {
    this.inputElement_.blur();
  }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
 * Check the inputs toggle state and update display.
 * @public
 */
MaterialCheckbox.prototype.checkToggleState = function () {
  'use strict';
  if (this.inputElement_.checked) {
    this.element_.classList.add(this.CssClasses_.IS_CHECKED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
  }
};
/**
 * Check the inputs disabled state and update display.
 * @public
 */
MaterialCheckbox.prototype.checkDisabled = function () {
  'use strict';
  if (this.inputElement_.disabled) {
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
  }
};
/**
 * Disable checkbox.
 * @public
 */
MaterialCheckbox.prototype.disable = function () {
  'use strict';
  this.inputElement_.disabled = true;
  this.updateClasses_();
};
/**
 * Enable checkbox.
 * @public
 */
MaterialCheckbox.prototype.enable = function () {
  'use strict';
  this.inputElement_.disabled = false;
  this.updateClasses_();
};
/**
 * Check checkbox.
 * @public
 */
MaterialCheckbox.prototype.check = function () {
  'use strict';
  this.inputElement_.checked = true;
  this.updateClasses_();
};
/**
 * Uncheck checkbox.
 * @public
 */
MaterialCheckbox.prototype.uncheck = function () {
  'use strict';
  this.inputElement_.checked = false;
  this.updateClasses_();
};
/**
 * Initialize element.
 */
MaterialCheckbox.prototype.init = function () {
  'use strict';
  if (this.element_) {
    this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
    var boxOutline = document.createElement('span');
    boxOutline.classList.add(this.CssClasses_.BOX_OUTLINE);
    var tickContainer = document.createElement('span');
    tickContainer.classList.add(this.CssClasses_.FOCUS_HELPER);
    var tickOutline = document.createElement('span');
    tickOutline.classList.add(this.CssClasses_.TICK_OUTLINE);
    boxOutline.appendChild(tickOutline);
    this.element_.appendChild(tickContainer);
    this.element_.appendChild(boxOutline);
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
      this.rippleContainerElement_ = document.createElement('span');
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
      this.boundRippleMouseUp = this.onMouseUp_.bind(this);
      this.rippleContainerElement_.addEventListener('mouseup', this.boundRippleMouseUp);
      var ripple = document.createElement('span');
      ripple.classList.add(this.CssClasses_.RIPPLE);
      this.rippleContainerElement_.appendChild(ripple);
      this.element_.appendChild(this.rippleContainerElement_);
    }
    this.boundInputOnChange = this.onChange_.bind(this);
    this.boundInputOnFocus = this.onFocus_.bind(this);
    this.boundInputOnBlur = this.onBlur_.bind(this);
    this.boundElementMouseUp = this.onMouseUp_.bind(this);
    this.inputElement_.addEventListener('change', this.boundInputOnChange);
    this.inputElement_.addEventListener('focus', this.boundInputOnFocus);
    this.inputElement_.addEventListener('blur', this.boundInputOnBlur);
    this.element_.addEventListener('mouseup', this.boundElementMouseUp);
    this.updateClasses_();
    this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
  }
};
/*
 * Downgrade the component.
 */
MaterialCheckbox.prototype.mdlDowngrade_ = function () {
  'use strict';
  if (this.rippleContainerElement_) {
    this.rippleContainerElement_.removeEventListener('mouseup', this.boundRippleMouseUp);
  }
  this.inputElement_.removeEventListener('change', this.boundInputOnChange);
  this.inputElement_.removeEventListener('focus', this.boundInputOnFocus);
  this.inputElement_.removeEventListener('blur', this.boundInputOnBlur);
  this.element_.removeEventListener('mouseup', this.boundElementMouseUp);
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialCheckbox,
  classAsString: 'MaterialCheckbox',
  cssClass: 'ulite-js-checkbox',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Checkbox MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialSwitch(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialSwitch.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialSwitch.prototype.CssClasses_ = {
  INPUT: 'switch-input',
  TRACK: 'switch-track',
  THUMB: 'switch-thumb',
  FOCUS_HELPER: 'switch-focus-helper',
  RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  RIPPLE_IGNORE_EVENTS: 'ulite-js-ripple-effect--ignore-events',
  RIPPLE_CONTAINER: 'switch-ripple-container',
  RIPPLE_CENTER: 'ulite-ripple--center',
  RIPPLE: 'ripple',
  IS_FOCUSED: 'is-focused',
  IS_DISABLED: 'is-disabled',
  IS_CHECKED: 'is-checked'
};
/**
 * Handle change of state.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialSwitch.prototype.onChange_ = function (event) {
  'use strict';
  this.updateClasses_();
};
/**
 * Handle focus of element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialSwitch.prototype.onFocus_ = function (event) {
  'use strict';
  this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle lost focus of element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialSwitch.prototype.onBlur_ = function (event) {
  'use strict';
  this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle mouseup.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialSwitch.prototype.onMouseUp_ = function (event) {
  'use strict';
  this.blur_();
};
/**
 * Handle class updates.
 * @private
 */
MaterialSwitch.prototype.updateClasses_ = function () {
  'use strict';
  this.checkDisabled();
  this.checkToggleState();
};
/**
 * Add blur.
 * @private
 */
MaterialSwitch.prototype.blur_ = function (event) {
  'use strict';
  // TODO: figure out why there's a focus event being fired after our blur,
  // so that we can avoid this hack.
  window.setTimeout(function () {
    this.inputElement_.blur();
  }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
* Check the components disabled state.
* @public
*/
MaterialSwitch.prototype.checkDisabled = function () {
  'use strict';
  if (this.inputElement_.disabled) {
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
  }
};
/**
* Check the components toggled state.
* @public
*/
MaterialSwitch.prototype.checkToggleState = function () {
  'use strict';
  if (this.inputElement_.checked) {
    this.element_.classList.add(this.CssClasses_.IS_CHECKED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
  }
};
/**
 * Disable switch.
 * @public
 */
MaterialSwitch.prototype.disable = function () {
  'use strict';
  this.inputElement_.disabled = true;
  this.updateClasses_();
};
/**
 * Enable switch.
 * @public
 */
MaterialSwitch.prototype.enable = function () {
  'use strict';
  this.inputElement_.disabled = false;
  this.updateClasses_();
};
/**
 * Activate switch.
 * @public
 */
MaterialSwitch.prototype.on = function () {
  'use strict';
  this.inputElement_.checked = true;
  this.updateClasses_();
};
/**
 * Deactivate switch.
 * @public
 */
MaterialSwitch.prototype.off = function () {
  'use strict';
  this.inputElement_.checked = false;
  this.updateClasses_();
};
/**
 * Initialize element.
 */
MaterialSwitch.prototype.init = function () {
  'use strict';
  if (this.element_) {
    this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
    var track = document.createElement('div');
    track.classList.add(this.CssClasses_.TRACK);
    var thumb = document.createElement('div');
    thumb.classList.add(this.CssClasses_.THUMB);
    var focusHelper = document.createElement('span');
    focusHelper.classList.add(this.CssClasses_.FOCUS_HELPER);
    thumb.appendChild(focusHelper);
    this.element_.appendChild(track);
    this.element_.appendChild(thumb);
    this.boundMouseUpHandler = this.onMouseUp_.bind(this);
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
      this.rippleContainerElement_ = document.createElement('span');
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
      this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
      this.rippleContainerElement_.addEventListener('mouseup', this.boundMouseUpHandler);
      var ripple = document.createElement('span');
      ripple.classList.add(this.CssClasses_.RIPPLE);
      this.rippleContainerElement_.appendChild(ripple);
      this.element_.appendChild(this.rippleContainerElement_);
    }
    this.boundChangeHandler = this.onChange_.bind(this);
    this.boundFocusHandler = this.onFocus_.bind(this);
    this.boundBlurHandler = this.onBlur_.bind(this);
    this.inputElement_.addEventListener('change', this.boundChangeHandler);
    this.inputElement_.addEventListener('focus', this.boundFocusHandler);
    this.inputElement_.addEventListener('blur', this.boundBlurHandler);
    this.element_.addEventListener('mouseup', this.boundMouseUpHandler);
    this.updateClasses_();
    this.element_.classList.add('is-upgraded');
  }
};
/*
* Downgrade the component.
*/
MaterialSwitch.prototype.mdlDowngrade_ = function () {
  'use strict';
  if (this.rippleContainerElement_) {
    this.rippleContainerElement_.removeEventListener('mouseup', this.boundMouseUpHandler);
  }
  this.inputElement_.removeEventListener('change', this.boundChangeHandler);
  this.inputElement_.removeEventListener('focus', this.boundFocusHandler);
  this.inputElement_.removeEventListener('blur', this.boundBlurHandler);
  this.element_.removeEventListener('mouseup', this.boundMouseUpHandler);
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialSwitch,
  classAsString: 'MaterialSwitch',
  cssClass: 'ulite-js-switch',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Textfield MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialTextfield(element) {
  'use strict';
  this.element_ = element;
  this.maxRows = this.Constant_.NO_MAX_ROWS;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialTextfield.prototype.Constant_ = {
  NO_MAX_ROWS: -1,
  MAX_ROWS_ATTRIBUTE: 'maxrows'
};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialTextfield.prototype.CssClasses_ = {
  LABEL: 'textfield-label',
  INPUT: 'textfield-input',
  IS_DIRTY: 'is-dirty',
  IS_FOCUSED: 'is-focused',
  IS_DISABLED: 'is-disabled',
  IS_INVALID: 'is-invalid',
  IS_UPGRADED: 'is-upgraded'
};
/**
 * Handle input being entered.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialTextfield.prototype.onKeyDown_ = function (event) {
  'use strict';
  var currentRowCount = event.target.value.split('\n').length;
  if (event.keyCode === 13) {
    if (currentRowCount >= this.maxRows) {
      event.preventDefault();
    }
  }
};
/**
 * Handle focus.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialTextfield.prototype.onFocus_ = function (event) {
  'use strict';
  this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle lost focus.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialTextfield.prototype.onBlur_ = function (event) {
  'use strict';
  this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
 * Handle class updates.
 * @param {HTMLElement} button The button whose classes we should update.
 * @param {HTMLElement} label The label whose classes we should update.
 * @private
 */
MaterialTextfield.prototype.updateClasses_ = function () {
  'use strict';
  this.checkDisabled();
  this.checkValidity();
  this.checkDirty();
};
// Public methods.
/**
 * Check the disabled state and update field accordingly.
 * @public
 */
MaterialTextfield.prototype.checkDisabled = function () {
  'use strict';
  if (this.input_.disabled) {
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
  }
};
/**
 * Check the validity state and update field accordingly.
 * @public
 */
MaterialTextfield.prototype.checkValidity = function () {
  'use strict';
  if (this.input_.validity.valid) {
    this.element_.classList.remove(this.CssClasses_.IS_INVALID);
  } else {
    this.element_.classList.add(this.CssClasses_.IS_INVALID);
  }
};
/**
 * Check the dirty state and update field accordingly.
 * @public
 */
MaterialTextfield.prototype.checkDirty = function () {
  'use strict';
  if (this.input_.value && this.input_.value.length > 0) {
    this.element_.classList.add(this.CssClasses_.IS_DIRTY);
  } else {
    this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
  }
};
/**
 * Disable text field.
 * @public
 */
MaterialTextfield.prototype.disable = function () {
  'use strict';
  this.input_.disabled = true;
  this.updateClasses_();
};
/**
 * Enable text field.
 * @public
 */
MaterialTextfield.prototype.enable = function () {
  'use strict';
  this.input_.disabled = false;
  this.updateClasses_();
};
/**
 * Update text field value.
 * @param {String} value The value to which to set the control (optional).
 * @public
 */
MaterialTextfield.prototype.change = function (value) {
  'use strict';
  if (value) {
    this.input_.value = value;
  }
  this.updateClasses_();
};
/**
 * Initialize element.
 */
MaterialTextfield.prototype.init = function () {
  'use strict';
  if (this.element_) {
    this.label_ = this.element_.querySelector('.' + this.CssClasses_.LABEL);
    this.input_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
    if (this.input_) {
      if (this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE)) {
        this.maxRows = parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE), 10);
        if (isNaN(this.maxRows)) {
          this.maxRows = this.Constant_.NO_MAX_ROWS;
        }
      }
      this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
      this.boundFocusHandler = this.onFocus_.bind(this);
      this.boundBlurHandler = this.onBlur_.bind(this);
      this.input_.addEventListener('input', this.boundUpdateClassesHandler);
      this.input_.addEventListener('focus', this.boundFocusHandler);
      this.input_.addEventListener('blur', this.boundBlurHandler);
      if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
        // TODO: This should handle pasting multi line text.
        // Currently doesn't.
        this.boundKeyDownHandler = this.onKeyDown_.bind(this);
        this.input_.addEventListener('keydown', this.boundKeyDownHandler);
      }
      this.updateClasses_();
      this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
  }
};
/*
 * Downgrade the component
 */
MaterialTextfield.prototype.mdlDowngrade_ = function () {
  'use strict';
  this.input_.removeEventListener('input', this.boundUpdateClassesHandler);
  this.input_.removeEventListener('focus', this.boundFocusHandler);
  this.input_.removeEventListener('blur', this.boundBlurHandler);
  if (this.boundKeyDownHandler) {
    this.input_.removeEventListener('keydown', this.boundKeyDownHandler);
  }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialTextfield,
  classAsString: 'MaterialTextfield',
  cssClass: 'ulite-js-textfield',
  widget: true
});
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Tabs MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialTabs(element) {
  'use strict';
  // Stores the HTML element.
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string}
 * @private
 */
MaterialTabs.prototype.Constant_ = {};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialTabs.prototype.CssClasses_ = {
  TAB_CLASS: 'tabs-tab',
  PANEL_CLASS: 'tabs-panel',
  ACTIVE_CLASS: 'is-active',
  UPGRADED_CLASS: 'is-upgraded',
  MDL_JS_RIPPLE_EFFECT: 'ulite-js-ripple-effect',
  MDL_RIPPLE_CONTAINER: 'tabs-ripple-container',
  MDL_RIPPLE: 'ripple',
  MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS: 'ulite-js-ripple-effect--ignore-events'
};
/**
 * Handle clicks to a tabs component
 * @private
 */
MaterialTabs.prototype.initTabs_ = function (e) {
  'use strict';
  if (this.element_.classList.contains(this.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
    this.element_.classList.add(this.CssClasses_.MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS);
  }
  // Select element tabs, document panels
  this.tabs_ = this.element_.querySelectorAll('.' + this.CssClasses_.TAB_CLASS);
  this.panels_ = this.element_.querySelectorAll('.' + this.CssClasses_.PANEL_CLASS);
  // Create new tabs for each tab element
  for (var i = 0; i < this.tabs_.length; i++) {
    new MaterialTab(this.tabs_[i], this);
  }
  this.element_.classList.add(this.CssClasses_.UPGRADED_CLASS);
};
/**
 * Reset tab state, dropping active classes
 * @private
 */
MaterialTabs.prototype.resetTabState_ = function () {
  'use strict';
  for (var k = 0; k < this.tabs_.length; k++) {
    this.tabs_[k].classList.remove(this.CssClasses_.ACTIVE_CLASS);
  }
};
/**
 * Reset panel state, droping active classes
 * @private
 */
MaterialTabs.prototype.resetPanelState_ = function () {
  'use strict';
  for (var j = 0; j < this.panels_.length; j++) {
    this.panels_[j].classList.remove(this.CssClasses_.ACTIVE_CLASS);
  }
};
MaterialTabs.prototype.init = function () {
  'use strict';
  if (this.element_) {
    this.initTabs_();
  }
};
function MaterialTab(tab, ctx) {
  'use strict';
  if (tab) {
    if (ctx.element_.classList.contains(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
      var rippleContainer = document.createElement('span');
      rippleContainer.classList.add(ctx.CssClasses_.MDL_RIPPLE_CONTAINER);
      rippleContainer.classList.add(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT);
      var ripple = document.createElement('span');
      ripple.classList.add(ctx.CssClasses_.MDL_RIPPLE);
      rippleContainer.appendChild(ripple);
      tab.appendChild(rippleContainer);
    }
    tab.addEventListener('click', function (e) {
      var tabEvents = $.Event('tabSelected.ulite.tabs', { relatedTarget: e.relatedTarget });
      $(tab).trigger(tabEvents);
      if (tabEvents.isDefaultPrevented()) {
        return;
      }

      e.preventDefault();
      var href = tab.href.split('#')[1];
      var panel = ctx.element_.querySelector('#' + href);
      ctx.resetTabState_();
      ctx.resetPanelState_();
      tab.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
      panel.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
    });
  }
}
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialTabs,
  classAsString: 'MaterialTabs',
  cssClass: 'ulite-js-tabs'
});
+ function ($) {
    'use strict';

    var Tag = function (element, options) {
        this.options = options;
        this.parentDom = $(element);
        this.removeAtSelected = this.options.removeAtSelected;
        this.selectedTagClickable = this.options.selectedTagClickable;
        this.type = this.options.type;
        this.tagClass = this.options.tagClass;
        this.selected = this.options.selected;
        this.avaliable = this.options.avaliable;
        this.selectedTextClass = this.options.selectedTextClass;
        this.selectedChangeClass = this.options.selectedChangeClass;
        this.selectedChangeText = this.options.selectedChangeText;
        this.tagQuery = '.' + this.tagClass;
        this.selectedChangeQuery = '.' + this.selectedChangeClass;
        this.dataId = this.options.dataId;
        this.dataName = this.options.dataName;
        this.selectedContainerClass = this.options.selectedContainerClass;
        this.avaliableContainerClass = this.options.avaliableContainerClass;
        this.selectedContainer = this.parentDom.find('.' + this.selectedContainerClass);
        this.avaliableContainer = this.parentDom.find('.' + this.avaliableContainerClass);
        this.init();
    };
    Tag.VERSION = '0.0.1';
    Tag.EVENTS = {
        parent: '.amos.tag',
        selectedClick: 'selectedClick.amos.tag',
        beforeSelected: 'beforeSelected.amos.tag',
        afterSelected: 'afterSelected.amos.tag',
        click: 'click.amos.tag'
    };
    Tag.DEFAULTS = {
        removeAtSelected: true,
        selectedTagClickable: false,
        type: 'multiple',
        tagClass: 'tag',
        selectedContainerClass: 'tag-selected-container',
        avaliableContainerClass: 'tag-avaliable-container',
        selectedTextClass: 'tag-text',
        selectedChangeClass: 'btn-link',
        selectedChangeText: '修改',
        dataId: 'id',
        dataName: 'name',
        selected: [],
        avaliable: []
    };
    Tag.prototype = {
        constructor: Tag,
        init: function () {
            this.reset();
            this.addSelected(this.selected);
            this.addAvaliable(this.avaliable);

            if (this.selectedTagClickable) {
                this.selectedContainer.on(Tag.EVENTS.click, this.tagQuery, $.proxy(this.selectedTagClick, this));
            } else {
                this.selectedContainer.on(Tag.EVENTS.click, this.selectedChangeQuery, $.proxy(this.selectedTagClick, this));
            }

            this.avaliableContainer.on(Tag.EVENTS.click, this.tagQuery, $.proxy(this.onSelected, this));
        },
        reset: function () {
            this.parentDom.off(Tag.EVENTS.parent);
            this.resetSelected();
            this.resetAvaliable();
        },
        resetSelected: function () {
            this.selectedContainer.html('');
        },
        resetAvaliable: function () {
            this.avaliableContainer.html('');
            this.avaliableContainer.hide();
        },
        addSelected: function (data) {
            for (var i = 0; i < data.length; i++) {
                var html = '<div class="' + this.tagClass + '" data-value="' + data[i][this.dataId] + '"><span class="' + this.selectedTextClass + '">' + data[i][this.dataName] + '</span><div class="' + this.selectedChangeClass + '">' + this.selectedChangeText + '</div></div>';
                this.selectedContainer.append(html);
            }
        },
        addAvaliable: function (data) {
            for (var i = 0; i < data.length; i++) {
                var html = '<div class="' + this.tagClass + '" data-value="' + data[i][this.dataId] + '"><span class="' + this.selectedTextClass + '">' + data[i][this.dataName] + '</span></div>';
                this.avaliableContainer.append(html);
            }
            this.avaliableContainer.show();
        },
        addAvaliableItem: function (data) {
            var html = '<div class="' + this.tagClass + '" data-value="' + data[this.dataId] + '"><span class="' + this.selectedTextClass + '">' + data[this.dataName] + '</span></div>';
            this.avaliableContainer.append(html);
        },
        selectedTagClick: function (originalEvent) {
            var selectedTagTrigger = $(originalEvent.currentTarget);

            var isTag = selectedTagTrigger.hasClass(this.tagClass);
            var selectedTag = {};
            if (isTag) {
                selectedTag = selectedTagTrigger;
            } else {
                selectedTag = selectedTagTrigger.parents(this.tagQuery);
            }

            var index = selectedTag.index();

            var relatedTarget = {
                relatedTarget: selectedTag[0]
            };

            var e = $.Event(Tag.EVENTS.selectedClick, relatedTarget);
            this.parentDom.trigger(e, [
                index
            ]);
            if (e.isDefaultPrevented()) {
                return;
            }
        },
        onSelected: function (originalEvent) {

            var selectedTag = $(originalEvent.currentTarget);
            var relatedTarget = {
                relatedTarget: selectedTag[0]
            };
            var value = selectedTag.data('value');
            var name = selectedTag.text();

            var e = $.Event(Tag.EVENTS.beforeSelected, relatedTarget);
            this.parentDom.trigger(e, [
                value,
                name
            ]);

            if (e.isDefaultPrevented()) {
                return;
            }


            if (this.removeAtSelected) {
                selectedTag.remove();
            }

            var selectedTagData = {};
            selectedTagData[this.dataId] = value;
            selectedTagData[this.dataName] = name;
            this.selected.push(selectedTagData);
            this.addSelected([selectedTagData]);

            e = $.Event(Tag.EVENTS.afterSelected, relatedTarget);
            this.parentDom.trigger(e, [
                value,
                name
            ]);
        },
    };

    // Tag PLUGIN DEFINITION
    // =======================
    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('amos.tag');
            var options = $.extend({}, Tag.DEFAULTS, $this.data(), typeof option === 'object' && option);
            if (!data) {
                $this.data('amos.tag', data = new Tag(this, options));
            }
            if (typeof option === 'string') {
                data[option](_relatedTarget);
            }
        });
    }
    var old = $.fn.tag;
    $.fn.tag = Plugin;
    $.fn.tag.Constructor = Tag;
    // Tag NO CONFLICT
    // =================
    $.fn.tag.noConflict = function () {
        $.fn.tag = old;
        return this;
    };
}(jQuery);

/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class constructor for Ripple MDL component.
 * Implements MDL component design pattern defined at:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 * @param {HTMLElement} element The element that will be upgraded.
 */
function MaterialRipple(element) {
  'use strict';
  this.element_ = element;
  // Initialize instance.
  this.init();
}
/**
 * Store constants in one place so they can be updated easily.
 * @enum {string | number}
 * @private
 */
MaterialRipple.prototype.Constant_ = {
  INITIAL_SCALE: 'scale(0.0001, 0.0001)',
  INITIAL_SIZE: '1px',
  INITIAL_OPACITY: '0.4',
  FINAL_OPACITY: '0',
  FINAL_SCALE: ''
};
/**
 * Store strings for class names defined by this component that are used in
 * JavaScript. This allows us to simply change it in one place should we
 * decide to modify at a later date.
 * @enum {string}
 * @private
 */
MaterialRipple.prototype.CssClasses_ = {
  RIPPLE_CENTER: 'ulite-ripple--center',
  RIPPLE_EFFECT_IGNORE_EVENTS: 'ulite-js-ripple-effect--ignore-events',
  RIPPLE: 'ripple',
  IS_ANIMATING: 'is-animating',
  IS_VISIBLE: 'is-visible'
};
/**
 * Handle mouse / finger down on element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRipple.prototype.downHandler_ = function (event) {
  'use strict';
  if (!this.rippleElement_.style.width && !this.rippleElement_.style.height) {
    var rect = this.element_.getBoundingClientRect();
    this.boundHeight = rect.height;
    this.boundWidth = rect.width;
    this.rippleSize_ = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 2 + 2;
    this.rippleElement_.style.width = this.rippleSize_ + 'px';
    this.rippleElement_.style.height = this.rippleSize_ + 'px';
  }
  this.rippleElement_.classList.add(this.CssClasses_.IS_VISIBLE);
  if (event.type === 'mousedown' && this.ignoringMouseDown_) {
    this.ignoringMouseDown_ = false;
  } else {
    if (event.type === 'touchstart') {
      this.ignoringMouseDown_ = true;
    }
    var frameCount = this.getFrameCount();
    if (frameCount > 0) {
      return;
    }
    this.setFrameCount(1);
    var bound = event.currentTarget.getBoundingClientRect();
    var x;
    var y;
    // Check if we are handling a keyboard click.
    if (event.clientX === 0 && event.clientY === 0) {
      x = Math.round(bound.width / 2);
      y = Math.round(bound.height / 2);
    } else {
      var clientX = event.clientX ? event.clientX : event.touches[0].clientX;
      var clientY = event.clientY ? event.clientY : event.touches[0].clientY;
      x = Math.round(clientX - bound.left);
      y = Math.round(clientY - bound.top);
    }
    this.setRippleXY(x, y);
    this.setRippleStyles(true);
    window.requestAnimationFrame(this.animFrameHandler.bind(this));
  }
};
/**
 * Handle mouse / finger up on element.
 * @param {Event} event The event that fired.
 * @private
 */
MaterialRipple.prototype.upHandler_ = function (event) {
  'use strict';
  // Don't fire for the artificial "mouseup" generated by a double-click.
  if (event && event.detail !== 2) {
    this.rippleElement_.classList.remove(this.CssClasses_.IS_VISIBLE);
  }
};
/**
 * Initialize element.
 */
MaterialRipple.prototype.init = function () {
  'use strict';
  if (this.element_) {
    var recentering = this.element_.classList.contains(this.CssClasses_.RIPPLE_CENTER);
    if (!this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT_IGNORE_EVENTS)) {
      this.rippleElement_ = this.element_.querySelector('.' + this.CssClasses_.RIPPLE);
      this.frameCount_ = 0;
      this.rippleSize_ = 0;
      this.x_ = 0;
      this.y_ = 0;
      // Touch start produces a compat mouse down event, which would cause a
      // second ripples. To avoid that, we use this property to ignore the first
      // mouse down after a touch start.
      this.ignoringMouseDown_ = false;
      this.boundDownHandler = this.downHandler_.bind(this);
      this.element_.addEventListener('mousedown', this.boundDownHandler);
      this.element_.addEventListener('touchstart', this.boundDownHandler);
      this.boundUpHandler = this.upHandler_.bind(this);
      this.element_.addEventListener('mouseup', this.boundUpHandler);
      this.element_.addEventListener('mouseleave', this.boundUpHandler);
      this.element_.addEventListener('touchend', this.boundUpHandler);
      this.element_.addEventListener('blur', this.boundUpHandler);
      this.getFrameCount = function () {
        return this.frameCount_;
      };
      this.setFrameCount = function (fC) {
        this.frameCount_ = fC;
      };
      this.getRippleElement = function () {
        return this.rippleElement_;
      };
      this.setRippleXY = function (newX, newY) {
        this.x_ = newX;
        this.y_ = newY;
      };
      this.setRippleStyles = function (start) {
        if (this.rippleElement_ !== null) {
          var transformString;
          var scale;
          var size;
          var offset = 'translate(' + this.x_ + 'px, ' + this.y_ + 'px)';
          if (start) {
            scale = this.Constant_.INITIAL_SCALE;
            size = this.Constant_.INITIAL_SIZE;
          } else {
            scale = this.Constant_.FINAL_SCALE;
            size = this.rippleSize_ + 'px';
            if (recentering) {
              offset = 'translate(' + this.boundWidth / 2 + 'px, ' + this.boundHeight / 2 + 'px)';
            }
          }
          transformString = 'translate(-50%, -50%) ' + offset + scale;
          this.rippleElement_.style.webkitTransform = transformString;
          this.rippleElement_.style.msTransform = transformString;
          this.rippleElement_.style.transform = transformString;
          if (start) {
            this.rippleElement_.classList.remove(this.CssClasses_.IS_ANIMATING);
          } else {
            this.rippleElement_.classList.add(this.CssClasses_.IS_ANIMATING);
          }
        }
      };
      this.animFrameHandler = function () {
        if (this.frameCount_-- > 0) {
          window.requestAnimationFrame(this.animFrameHandler.bind(this));
        } else {
          this.setRippleStyles(false);
        }
      };
    }
  }
};
/*
* Downgrade the component
*/
MaterialRipple.prototype.mdlDowngrade_ = function () {
  'use strict';
  this.element_.removeEventListener('mousedown', this.boundDownHandler);
  this.element_.removeEventListener('touchstart', this.boundDownHandler);
  this.element_.removeEventListener('mouseup', this.boundUpHandler);
  this.element_.removeEventListener('mouseleave', this.boundUpHandler);
  this.element_.removeEventListener('touchend', this.boundUpHandler);
  this.element_.removeEventListener('blur', this.boundUpHandler);
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
  constructor: MaterialRipple,
  classAsString: 'MaterialRipple',
  cssClass: 'ulite-js-ripple-effect',
  widget: false
});
/* ========================================================================
 * Bootstrap: transition.js v3.3.5
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+function ($) {
  'use strict';
  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================
  function transitionEnd() {
    var el = document.createElement('bootstrap');
    var transEndEventNames = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      OTransition: 'oTransitionEnd otransitionend',
      transition: 'transitionend'
    };
    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] };
      }
    }
    return false  // explicit for ie8 (  ._.)
;
  }
  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false;
    var $el = this;
    $(this).one('bsTransitionEnd', function () {
      called = true;
    });
    var callback = function () {
      if (!called) {
        $($el).trigger($.support.transition.end);
      }
    };
    setTimeout(callback, duration);
    return this;
  };
  $(function () {
    $.support.transition = transitionEnd();
    if (!$.support.transition) {
      return;
    }
    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) {
          return e.handleObj.handler.apply(this, arguments);
        }
      }
    };
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: carousel.js v3.3.5
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+ function ($) {
    'use strict';
    // CAROUSEL CLASS DEFINITION
    // =========================
    var Carousel = function (element, options) {
        this.$element = $(element);
        this.$indicators = this.$element.find('.carousel-indicators');
        this.options = options;
        this.paused = null;
        this.sliding = null;
        this.interval = null;
        this.$active = null;
        this.$items = null;
        if (this.options.keyboard) {
            this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this));
        }
        if (this.options.pause === 'hover' && !('ontouchstart' in document.documentElement)) {
            this.$element.on('mouseenter.bs.carousel', $.proxy(this.pause, this)).on('mouseleave.bs.carousel', $.proxy(this.cycle, this));
        }
        if (this.options.touch) {
            this.$element
                .on('touchstart.bs.carousel', $.proxy(this.onTouchStart, this))
                .on('touchmove.bs.carousel', $.proxy(this.onTouchMove, this))
                .on('touchend.bs.carousel', $.proxy(this.onTouchEnd, this));
        }
    };
    Carousel.VERSION = '3.3.5';
    Carousel.TRANSITION_DURATION = 600;
    Carousel.DEFAULTS = {
        interval: 3000,
        pause: 'hover',
        wrap: true,
        keyboard: true,
        touch: false
    };
    Carousel.prototype.onTouchStart = function (e) {
        var touch = e.originalEvent.targetTouches[0]; //touches数组对象获得屏幕上所有的touch，取第一个touch
        this.startPos = {
            x: touch.pageX,
            y: touch.pageY,
            time: +new Date
        }; //取第一个touch的坐标值
        this.isScrolling = 0; //这个参数判断是垂直滚动还是水平滚动
    };
    Carousel.prototype.onTouchMove = function (e) {
        //当屏幕有多个touch或者页面被缩放过，就不执行move操作
        if (e.originalEvent.targetTouches.length > 1 || e.scale && e.scale !== 1) return;
        var touch = e.originalEvent.targetTouches[0];
        this.endPos = {
            x: touch.pageX - this.startPos.x,
            y: touch.pageY - this.startPos.y
        };
        this.isScrolling = Math.abs(this.endPos.x) < Math.abs(this.endPos.y) ? 1 : 0; //isScrolling为1时，表示纵向滑动，0为横向滑动
        if (this.isScrolling === 0) {
            e.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
        }
    };
    Carousel.prototype.onTouchEnd = function (e) {
        var duration = +new Date - this.startPos.time; //滑动的持续时间
        if (this.isScrolling === 0) { //当为水平滚动时
            if (Number(duration) > 10) {
                //判断是左移还是右移，当偏移量大于10时执行
                if (this.endPos.x > 10) {
                    this.prev();
                } else if (this.endPos.x < -10) {
                    this.next();
                }
            }
        }
    };
    Carousel.prototype.keydown = function (e) {
        if (/input|textarea/i.test(e.target.tagName)) {
            return;
        }
        switch (e.which) {
            case 37:
                this.prev();
                break;
            case 39:
                this.next();
                break;
            default:
                return;
        }
        e.preventDefault();
    };
    Carousel.prototype.cycle = function (e) {
        e || (this.paused = false);
        this.interval && clearInterval(this.interval);
        this.options.interval && !this.paused && (this.interval = setInterval($.proxy(this.next, this), this.options.interval));
        return this;
    };
    /*根据传入的item对象查询索引值*/
    Carousel.prototype.getItemIndex = function (item) {
        this.$items = item.parent().children('.item');
        return this.$items.index(item || this.$active);
    };
    /*根据传入当前显示的item对象以及准备的轮转方向prev或next获取下一个显示的item对象*/
    Carousel.prototype.getItemForDirection = function (direction, active) {
        var activeIndex = this.getItemIndex(active);
        var willWrap = direction === 'prev' && activeIndex === 0 || direction === 'next' && activeIndex === this.$items.length - 1;
        if (willWrap && !this.options.wrap) {
            return active;
        }
        var delta = direction === 'prev' ? -1 : 1;
        var itemIndex = (activeIndex + delta) % this.$items.length;
        return this.$items.eq(itemIndex);
    };
    Carousel.prototype.to = function (pos) {
        var that = this;
        var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'));
        if (pos > this.$items.length - 1 || pos < 0) {
            return;
        }
        if (this.sliding) {
            return this.$element.one('slid.bs.carousel', function () {
                that.to(pos);
            });
        }
        // yes, "slid"
        if (activeIndex === pos) {
            return this.pause().cycle();
        }
        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos));
    };
    Carousel.prototype.pause = function (e) {
        e || (this.paused = true);
        if (this.$element.find('.next, .prev').length && $.support.transition) {
            this.$element.trigger($.support.transition.end);
            this.cycle(true);
        }
        this.interval = clearInterval(this.interval);
        return this;
    };
    Carousel.prototype.next = function () {
        if (this.sliding) {
            return;
        }
        return this.slide('next');
    };
    Carousel.prototype.prev = function () {
        if (this.sliding) {
            return;
        }
        return this.slide('prev');
    };
    Carousel.prototype.slide = function (type, next) {
        var $active = this.$element.find('.item.active');
        var $next = next || this.getItemForDirection(type, $active);
        var isCycling = this.interval;
        var direction = type === 'next' ? 'left' : 'right';
        var that = this;
        if ($next.hasClass('active')) {
            return this.sliding = false;
        }
        var relatedTarget = $next[0];
        var slideEvent = $.Event('slide.bs.carousel', {
            relatedTarget: relatedTarget,
            direction: direction
        });
        this.$element.trigger(slideEvent);
        if (slideEvent.isDefaultPrevented()) {
            return;
        }
        this.sliding = true;
        isCycling && this.pause();
        if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active');
            var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)]);
            $nextIndicator && $nextIndicator.addClass('active');
        }
        var slidEvent = $.Event('slid.bs.carousel', {
            relatedTarget: relatedTarget,
            direction: direction
        });
        // yes, "slid"
        if ($.support.transition && this.$element.hasClass('slide')) {
            $next.addClass(type);
            $next[0].offsetWidth;
            // force reflow
            $active.addClass(direction);
            $next.addClass(direction);
            $active.one('bsTransitionEnd', function () {
                $next.removeClass([
                    type,
                    direction
                ].join(' ')).addClass('active');
                $active.removeClass([
                    'active',
                    direction
                ].join(' '));
                that.sliding = false;
                setTimeout(function () {
                    that.$element.trigger(slidEvent);
                }, 0);
            }).emulateTransitionEnd(Carousel.TRANSITION_DURATION);
        } else {
            $active.removeClass('active');
            $next.addClass('active');
            this.sliding = false;
            this.$element.trigger(slidEvent);
        }
        isCycling && this.cycle();
        return this;
    };
    // CAROUSEL PLUGIN DEFINITION
    // ==========================
    function Plugin(option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('bs.carousel');
            var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option === 'object' && option);
            var action = typeof option === 'string' ? option : options.slide;
            if (!data) {
                $this.data('bs.carousel', data = new Carousel(this, options));
            }
            if (typeof option === 'number') {
                data.to(option);
            } else if (action) {
                data[action]();
            } else if (options.interval) {
                data.pause().cycle();
            }
        });
    }
    var old = $.fn.carousel;
    $.fn.carousel = Plugin;
    $.fn.carousel.Constructor = Carousel;
    // CAROUSEL NO CONFLICT
    // ====================
    $.fn.carousel.noConflict = function () {
        $.fn.carousel = old;
        return this;
    };
    // CAROUSEL DATA-API
    // =================
    var clickHandler = function (e) {
        var href;
        var $this = $(this);
        var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''));
        // strip for ie7
        if (!$target.hasClass('carousel')) {
            return;
        }
        var options = $.extend({}, $target.data(), $this.data());
        var slideIndex = $this.attr('data-slide-to');
        if (slideIndex) {
            options.interval = false;
        }
        Plugin.call($target, options);
        if (slideIndex) {
            $target.data('bs.carousel').to(slideIndex);
        }
        e.preventDefault();
    };
    $(document).on('click.bs.carousel.data-api', '[data-slide]', clickHandler).on('mouseenter.bs.carousel.data-api', '[data-slide-to]', clickHandler);
    $(window).on('load', function () {
        $('[data-ride="carousel"]').each(function () {
            var $carousel = $(this);
            Plugin.call($carousel, $carousel.data());
        });
    });
}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.3.5
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+ function($) {
    'use strict';
    // DROPDOWN CLASS DEFINITION
    // =========================
    var backdrop = '.dropdown-backdrop';
    var toggle = '[data-toggle="dropdown"]';
    var Dropdown = function(element) {
        $(element).on('click.bs.dropdown', this.toggle);
    };
    Dropdown.VERSION = '3.3.5';

    function getParent($this) {
        var selector = $this.attr('data-target');
        if (!selector) {
            selector = $this.attr('href');
            selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
            ;
        }
        var $parent = selector && $(selector);
        return $parent && $parent.length ? $parent : $this.parent();
    }

    function clearMenus(e) {
        if (e && e.which === 3) {
            return;
        }
        $(backdrop).remove();
        $(toggle).each(function() {
            var $this = $(this);
            var $parent = getParent($this);
            var relatedTarget = {
                relatedTarget: this
            };
            if (!$parent.hasClass('open')) {
                return;
            }
            if (e && e.type === 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) {
                return;
            }
            $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget));
            if (e.isDefaultPrevented()) {
                return;
            }
            $this.attr('aria-expanded', 'false');
            $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget));
        });
    }
    Dropdown.prototype.show = function(e) {
        var $this = $(this);
        if ($this.is('.disabled, :disabled')) {
            return;
        }
        var $parent = getParent($this);
        clearMenus();
        if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
            // if mobile we use a backdrop because click events don't delegate
            $(document.createElement('div')).addClass('dropdown-backdrop').insertAfter($(this)).on('click', clearMenus);
        }
        var relatedTarget = {
            relatedTarget: this
        };
        $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget));
        if (e.isDefaultPrevented()) {
            return;
        }
        $this.trigger('focus').attr('aria-expanded', 'true');
        $parent.addClass('open').trigger($.Event('shown.bs.dropdown', relatedTarget));
        return false;

    };
    Dropdown.prototype.hide = function(e) {
        clearMenus();
    };
    Dropdown.prototype.toggle = function(e) {
        var $this = $(this);
        if ($this.is('.disabled, :disabled')) {
            return;
        }
        var $parent = getParent($this);
        var isActive = $parent.hasClass('open');
        clearMenus();
        if (!isActive) {
            if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                // if mobile we use a backdrop because click events don't delegate
                $(document.createElement('div')).addClass('dropdown-backdrop').insertAfter($(this)).on('click', clearMenus);
            }
            var relatedTarget = {
                relatedTarget: this
            };
            $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget));
            if (e.isDefaultPrevented()) {
                return;
            }
            $this.trigger('focus').attr('aria-expanded', 'true');
            $parent.toggleClass('open').trigger($.Event('shown.bs.dropdown', relatedTarget));
        }
        return false;
    };
    Dropdown.prototype.keydown = function(e) {
        if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) {
            return;
        }
        var $this = $(this);
        e.preventDefault();
        e.stopPropagation();
        if ($this.is('.disabled, :disabled')) {
            return;
        }
        var $parent = getParent($this);
        var isActive = $parent.hasClass('open');
        if (!isActive && e.which !== 27 || isActive && e.which === 27) {
            if (e.which === 27) {
                $parent.find(toggle).trigger('focus');
            }
            return $this.trigger('click');
        }
        var desc = ' li:not(.disabled):visible a';
        var $items = $parent.find('.dropdown-menu' + desc);
        if (!$items.length) {
            return;
        }
        var index = $items.index(e.target);
        if (e.which === 38 && index > 0) {
            index--;
        }
        // up
        if (e.which === 40 && index < $items.length - 1) {
            index++;
        }
        // down
        if (!~index) {
            index = 0;
        }
        $items.eq(index).trigger('focus');
    };
    // DROPDOWN PLUGIN DEFINITION
    // ==========================
    function Plugin(option) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('bs.dropdown');
            if (!data) {
                $this.data('bs.dropdown', data = new Dropdown(this));
            }
            if (typeof option === 'string') {
                data[option].call($this);
            }
        });
    }
    var old = $.fn.dropdown;
    $.fn.dropdown = Plugin;
    $.fn.dropdown.Constructor = Dropdown;
    // DROPDOWN NO CONFLICT
    // ====================
    $.fn.dropdown.noConflict = function() {
        $.fn.dropdown = old;
        return this;
    };
    // APPLY TO STANDARD DROPDOWN ELEMENTS
    // ===================================
    $(document).on('click.bs.dropdown.data-api', clearMenus).on('click.bs.dropdown.data-api', '.dropdown form', function(e) {
        e.stopPropagation();
    }).on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle).on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown).on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown);
}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.3.5
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+function ($) {
  'use strict';
  // MODAL CLASS DEFINITION
  // ======================
  var Modal = function (element, options) {
    this.options = options;
    this.$body = $(document.body);
    this.$element = $(element);
    this.$dialog = this.$element.find('.modal-dialog');
    this.$backdrop = null;
    this.isShown = null;
    this.originalBodyPad = null;
    this.scrollbarWidth = 0;
    this.ignoreBackdropClick = false;
    if (this.options.remote) {
      this.$element.find('.modal-content').load(this.options.remote, $.proxy(function () {
        this.$element.trigger('loaded.bs.modal');
      }, this));
    }
  };
  Modal.VERSION = '3.3.5';
  Modal.TRANSITION_DURATION = 300;
  Modal.BACKDROP_TRANSITION_DURATION = 150;
  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  };
  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget);
  };
  Modal.prototype.show = function (_relatedTarget) {
    var that = this;
    var e = $.Event('show.bs.modal', { relatedTarget: _relatedTarget });
    this.$element.trigger(e);
    if (this.isShown || e.isDefaultPrevented()) {
      return;
    }
    this.isShown = true;
    this.checkScrollbar();
    this.setScrollbar();
    this.$body.addClass('modal-open');
    this.escape();
    this.resize();
    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this));
    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) {
          that.ignoreBackdropClick = true;
        }
      });
    });
    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade');
      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body)  // don't move modals dom position
;
      }
      that.$element.show().scrollTop(0);
      that.adjustDialog();
      if (transition) {
        that.$element[0].offsetWidth;
      }
      that.$element.addClass('in');
      that.enforceFocus();
      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget });
      transition ? that.$dialog.one('bsTransitionEnd', function () {
        that.$element.trigger('focus').trigger(e);
      }).emulateTransitionEnd(Modal.TRANSITION_DURATION) : that.$element.trigger('focus').trigger(e);
    });
  };
  Modal.prototype.hide = function (e) {
    if (e) {
      e.preventDefault();
    }
    e = $.Event('hide.bs.modal');
    this.$element.trigger(e);
    if (!this.isShown || e.isDefaultPrevented()) {
      return;
    }
    this.isShown = false;
    this.escape();
    this.resize();
    $(document).off('focusin.bs.modal');
    this.$element.removeClass('in').off('click.dismiss.bs.modal').off('mouseup.dismiss.bs.modal');
    this.$dialog.off('mousedown.dismiss.bs.modal');
    $.support.transition && this.$element.hasClass('fade') ? this.$element.one('bsTransitionEnd', $.proxy(this.hideModal, this)).emulateTransitionEnd(Modal.TRANSITION_DURATION) : this.hideModal();
  };
  Modal.prototype.enforceFocus = function () {
    $(document).off('focusin.bs.modal')  // guard against infinite focus loop
.on('focusin.bs.modal', $.proxy(function (e) {
      if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
        this.$element.trigger('focus');
      }
    }, this));
  };
  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which === 27 && this.hide();
      }, this));
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal');
    }
  };
  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this));
    } else {
      $(window).off('resize.bs.modal');
    }
  };
  Modal.prototype.hideModal = function () {
    var that = this;
    this.$element.hide();
    this.backdrop(function () {
      that.$body.removeClass('modal-open');
      that.resetAdjustments();
      that.resetScrollbar();
      that.$element.trigger('hidden.bs.modal');
    });
  };
  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove();
    this.$backdrop = null;
  };
  Modal.prototype.backdrop = function (callback) {
    var that = this;
    var animate = this.$element.hasClass('fade') ? 'fade' : '';
    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate;
      this.$backdrop = $(document.createElement('div')).addClass('modal-backdrop ' + animate).appendTo(this.$body);
      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false;
          return;
        }
        if (e.target !== e.currentTarget) {
          return;
        }
        this.options.backdrop === 'static' ? this.$element[0].focus() : this.hide();
      }, this));
      if (doAnimate) {
        this.$backdrop[0].offsetWidth;
      }
      // force reflow
      this.$backdrop.addClass('in');
      if (!callback) {
        return;
      }
      doAnimate ? this.$backdrop.one('bsTransitionEnd', callback).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) : callback();
    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in');
      var callbackRemove = function () {
        that.removeBackdrop();
        callback && callback();
      };
      $.support.transition && this.$element.hasClass('fade') ? this.$backdrop.one('bsTransitionEnd', callbackRemove).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) : callbackRemove();
    } else if (callback) {
      callback();
    }
  };
  // these following methods are used to handle overflowing modals
  Modal.prototype.handleUpdate = function () {
    this.adjustDialog();
  };
  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight;
    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    });
  };
  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    });
  };
  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth;
    if (!fullWindowWidth) {
      // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect();
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left);
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth;
    this.scrollbarWidth = this.measureScrollbar();
  };
  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt(this.$body.css('padding-right') || 0, 10);
    this.originalBodyPad = document.body.style.paddingRight || '';
    if (this.bodyIsOverflowing) {
      this.$body.css('padding-right', bodyPad + this.scrollbarWidth);
    }
  };
  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad);
  };
  Modal.prototype.measureScrollbar = function () {
    // thx walsh
    var scrollDiv = document.createElement('div');
    scrollDiv.className = 'modal-scrollbar-measure';
    this.$body.append(scrollDiv);
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    this.$body[0].removeChild(scrollDiv);
    return scrollbarWidth;
  };
  // MODAL PLUGIN DEFINITION
  // =======================
  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.modal');
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option === 'object' && option);
      if (!data) {
        $this.data('bs.modal', data = new Modal(this, options));
      }
      if (typeof option === 'string') {
        data[option](_relatedTarget);
      } else if (options.show) {
        data.show(_relatedTarget);
      }
    });
  }
  var old = $.fn.modal;
  $.fn.modal = Plugin;
  $.fn.modal.Constructor = Modal;
  // MODAL NO CONFLICT
  // =================
  $.fn.modal.noConflict = function () {
    $.fn.modal = old;
    return this;
  };
  // MODAL DATA-API
  // ==============
  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this);
    var href = $this.attr('href');
    var $target = $($this.attr('data-target') || href && href.replace(/.*(?=#[^\s]+$)/, ''));
    // strip for ie7
    var option = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data());
    if ($this.is('a')) {
      e.preventDefault();
    }
    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) {
        return;
      }
      // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus');
      });
    });
    Plugin.call($target, option, this);
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: collapse.js v3.3.5
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+function ($) {
  'use strict';
  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================
  var Collapse = function (element, options, _relatedTarget) {
    this.$element = $(element);
    this.options = $.extend({}, Collapse.DEFAULTS, options);
    this.$trigger = $('[data-toggle="collapse"][href="#' + element.id + '"],' + '[data-toggle="collapse"][data-target="#' + element.id + '"]');
    this.transitioning = null;
    if (this.options.parent) {
      this.$parent = this.getParent();
    } else {
      this.addAriaAndCollapsedClass(this.$element, this.$trigger);
    }
    if (this.options.toggle) {
      this.toggle(_relatedTarget);
    }
  };
  Collapse.VERSION = '3.3.5';
  Collapse.TRANSITION_DURATION = 350;
  Collapse.DEFAULTS = { toggle: true };
  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width');
    return hasWidth ? 'width' : 'height';
  };
  Collapse.prototype.show = function (_relatedTarget) {
    if (this.transitioning || this.$element.hasClass('in')) {
      return;
    }
    var activesData;
    var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing');
    if (actives && actives.length) {
      activesData = actives.data('bs.collapse');
      if (activesData && activesData.transitioning) {
        return;
      }
    }
    var startEvent = $.Event('show.bs.collapse', { relatedTarget: _relatedTarget });
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) {
      return;
    }
    if (actives && actives.length) {
      Plugin.call(actives, 'hide');
      activesData || actives.data('bs.collapse', null);
    }
    var dimension = this.dimension();
    this.$element.removeClass('collapse').addClass('collapsing')[dimension](0).attr('aria-expanded', true);
    this.$trigger.removeClass('collapsed').attr('aria-expanded', true);
    this.transitioning = 1;
    var complete = function () {
      this.$element.removeClass('collapsing').addClass('collapse in')[dimension]('');
      this.transitioning = 0;
      this.$element.trigger('shown.bs.collapse');
    };
    if (!$.support.transition) {
      return complete.call(this);
    }
    var scrollSize = $.camelCase([
      'scroll',
      dimension
    ].join('-'));
    this.$element.one('bsTransitionEnd', $.proxy(complete, this)).emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize]);
  };
  Collapse.prototype.hide = function (_relatedTarget) {
    if (this.transitioning || !this.$element.hasClass('in')) {
      return;
    }
    var startEvent = $.Event('hide.bs.collapse', { relatedTarget: _relatedTarget });
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) {
      return;
    }
    var dimension = this.dimension();
    this.$element[dimension](this.$element[dimension]())[0].offsetHeight;
    this.$element.addClass('collapsing').removeClass('collapse in').attr('aria-expanded', false);
    this.$trigger.addClass('collapsed').attr('aria-expanded', false);
    this.transitioning = 1;
    var complete = function () {
      this.transitioning = 0;
      this.$element.removeClass('collapsing').addClass('collapse').trigger('hidden.bs.collapse');
    };
    if (!$.support.transition) {
      return complete.call(this);
    }
    this.$element[dimension](0).one('bsTransitionEnd', $.proxy(complete, this)).emulateTransitionEnd(Collapse.TRANSITION_DURATION);
  };
  Collapse.prototype.toggle = function (_relatedTarget) {
    this[this.$element.hasClass('in') ? 'hide' : 'show'](_relatedTarget);
  };
  Collapse.prototype.getParent = function () {
    return $(this.options.parent).find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]').each($.proxy(function (i, element) {
      var $element = $(element);
      this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element);
    }, this)).end();
  };
  Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
    var isOpen = $element.hasClass('in');
    $element.attr('aria-expanded', isOpen);
    $trigger.toggleClass('collapsed', !isOpen).attr('aria-expanded', isOpen);
  };
  function getTargetFromTrigger($trigger) {
    var href;
    var target = $trigger.attr('data-target') || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '');
    // strip for ie7
    return $(target);
  }
  // COLLAPSE PLUGIN DEFINITION
  // ==========================
  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.collapse');
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option === 'object' && option);
      if (!data && options.toggle && /show|hide/.test(option)) {
        options.toggle = false;
      }
      if (!data) {
        $this.data('bs.collapse', data = new Collapse(this, options, _relatedTarget));
      }
      if (typeof option === 'string') {
        data[option](_relatedTarget);
      }
    });
  }
  var old = $.fn.collapse;
  $.fn.collapse = Plugin;
  $.fn.collapse.Constructor = Collapse;
  // COLLAPSE NO CONFLICT
  // ====================
  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old;
    return this;
  };
  // COLLAPSE DATA-API
  // =================
  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this = $(this);
    if (!$this.attr('data-target')) {
      e.preventDefault();
    }
    var $target = getTargetFromTrigger($this);
    var data = $target.data('bs.collapse');
    var option = data ? 'toggle' : $this.data();
    Plugin.call($target, option, this);
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: tooltip.js v3.3.5
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */
+function ($) {
  'use strict';
  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================
  var Tooltip = function (element, options) {
    this.type = null;
    this.options = null;
    this.enabled = null;
    this.timeout = null;
    this.hoverState = null;
    this.$element = null;
    this.inState = null;
    this.init('tooltip', element, options);
  };
  Tooltip.VERSION = '3.3.5';
  Tooltip.TRANSITION_DURATION = 150;
  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  };
  Tooltip.prototype.init = function (type, element, options) {
    this.enabled = true;
    this.type = type;
    this.$element = $(element);
    this.options = this.getOptions(options);
    this.$viewport = this.options.viewport && $($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : this.options.viewport.selector || this.options.viewport);
    this.inState = {
      click: false,
      hover: false,
      focus: false
    };
    if (this.$element[0] instanceof document.constructor && !this.options.selector) {
      throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!');
    }
    var triggers = this.options.trigger.split(' ');
    for (var i = triggers.length; i--;) {
      var trigger = triggers[i];
      if (trigger === 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this));
      } else if (trigger !== 'manual') {
        var eventIn = trigger === 'hover' ? 'mouseenter' : 'focusin';
        var eventOut = trigger === 'hover' ? 'mouseleave' : 'focusout';
        this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
      }
    }
    this.options.selector ? this._options = $.extend({}, this.options, {
      trigger: 'manual',
      selector: ''
    }) : this.fixTitle();
  };
  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS;
  };
  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options);
    if (options.delay && typeof options.delay === 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      };
    }
    return options;
  };
  Tooltip.prototype.getDelegateOptions = function () {
    var options = {};
    var defaults = this.getDefaults();
    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] !== value) {
        options[key] = value;
      }
    });
    return options;
  };
  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);
    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
      $(obj.currentTarget).data('bs.' + this.type, self);
    }
    if (obj instanceof $.Event) {
      self.inState[obj.type === 'focusin' ? 'focus' : 'hover'] = true;
    }
    if (self.tip().hasClass('in') || self.hoverState === 'in') {
      self.hoverState = 'in';
      return;
    }
    clearTimeout(self.timeout);
    self.hoverState = 'in';
    if (!self.options.delay || !self.options.delay.show) {
      return self.show();
    }
    self.timeout = setTimeout(function () {
      if (self.hoverState === 'in') {
        self.show();
      }
    }, self.options.delay.show);
  };
  Tooltip.prototype.isInStateTrue = function () {
    for (var key in this.inState) {
      if (this.inState[key]) {
        return true;
      }
    }
    return false;
  };
  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);
    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
      $(obj.currentTarget).data('bs.' + this.type, self);
    }
    if (obj instanceof $.Event) {
      self.inState[obj.type === 'focusout' ? 'focus' : 'hover'] = false;
    }
    if (self.isInStateTrue()) {
      return;
    }
    clearTimeout(self.timeout);
    self.hoverState = 'out';
    if (!self.options.delay || !self.options.delay.hide) {
      return self.hide();
    }
    self.timeout = setTimeout(function () {
      if (self.hoverState === 'out') {
        self.hide();
      }
    }, self.options.delay.hide);
  };
  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type);
    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e);
      var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0]);
      if (e.isDefaultPrevented() || !inDom) {
        return;
      }
      var that = this;
      var $tip = this.tip();
      var tipId = this.getUID(this.type);
      this.setContent();
      $tip.attr('id', tipId);
      this.$element.attr('aria-describedby', tipId);
      if (this.options.animation) {
        $tip.addClass('fade');
      }
      var placement = typeof this.options.placement === 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;
      var autoToken = /\s?auto?\s?/i;
      var autoPlace = autoToken.test(placement);
      if (autoPlace) {
        placement = placement.replace(autoToken, '') || 'top';
      }
      $tip.detach().css({
        top: 0,
        left: 0,
        display: 'block'
      }).addClass(placement).data('bs.' + this.type, this);
      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);
      this.$element.trigger('inserted.bs.' + this.type);
      var pos = this.getPosition();
      var actualWidth = $tip[0].offsetWidth;
      var actualHeight = $tip[0].offsetHeight;
      if (autoPlace) {
        var orgPlacement = placement;
        var viewportDim = this.getPosition(this.$viewport);
        placement = placement === 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top' : placement === 'top' && pos.top - actualHeight < viewportDim.top ? 'bottom' : placement === 'right' && pos.right + actualWidth > viewportDim.width ? 'left' : placement === 'left' && pos.left - actualWidth < viewportDim.left ? 'right' : placement;
        $tip.removeClass(orgPlacement).addClass(placement);
      }
      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
      this.applyPlacement(calculatedOffset, placement);
      var complete = function () {
        var prevHoverState = that.hoverState;
        that.$element.trigger('shown.bs.' + that.type);
        that.hoverState = null;
        if (prevHoverState === 'out') {
          that.leave(that);
        }
      };
      $.support.transition && this.$tip.hasClass('fade') ? $tip.one('bsTransitionEnd', complete).emulateTransitionEnd(Tooltip.TRANSITION_DURATION) : complete();
    }
  };
  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip = this.tip();
    var width = $tip[0].offsetWidth;
    var height = $tip[0].offsetHeight;
    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10);
    var marginLeft = parseInt($tip.css('margin-left'), 10);
    // we must check for NaN for ie 8/9
    if (isNaN(marginTop)) {
      marginTop = 0;
    }
    if (isNaN(marginLeft)) {
      marginLeft = 0;
    }
    offset.top += marginTop;
    offset.left += marginLeft;
    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        });
      }
    }, offset), 0);
    $tip.addClass('in');
    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth = $tip[0].offsetWidth;
    var actualHeight = $tip[0].offsetHeight;
    if (placement === 'top' && actualHeight !== height) {
      offset.top = offset.top + height - actualHeight;
    }
    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);
    if (delta.left) {
      offset.left += delta.left;
    } else {
      offset.top += delta.top;
    }
    var isVertical = /top|bottom/.test(placement);
    var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight;
    var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight';
    $tip.offset(offset);
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical);
  };
  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
    this.arrow().css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%').css(isVertical ? 'top' : 'left', '');
  };
  Tooltip.prototype.setContent = function () {
    var $tip = this.tip();
    var title = this.getTitle();
    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title);
    $tip.removeClass('fade in top bottom left right');
  };
  Tooltip.prototype.hide = function (callback) {
    var that = this;
    var $tip = $(this.$tip);
    var e = $.Event('hide.bs.' + this.type);
    function complete() {
      if (that.hoverState !== 'in') {
        $tip.detach();
      }
      that.$element.removeAttr('aria-describedby').trigger('hidden.bs.' + that.type);
      callback && callback();
    }
    this.$element.trigger(e);
    if (e.isDefaultPrevented()) {
      return;
    }
    $tip.removeClass('in');
    $.support.transition && $tip.hasClass('fade') ? $tip.one('bsTransitionEnd', complete).emulateTransitionEnd(Tooltip.TRANSITION_DURATION) : complete();
    this.hoverState = null;
    return this;
  };
  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element;
    if ($e.attr('title') || typeof $e.attr('data-original-title') !== 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '');
    }
  };
  Tooltip.prototype.hasContent = function () {
    return this.getTitle();
  };
  Tooltip.prototype.getPosition = function ($element) {
    $element = $element || this.$element;
    var el = $element[0];
    var isBody = el.tagName === 'BODY';
    var elRect = el.getBoundingClientRect();
    if (elRect.width === null) {
      // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
      elRect = $.extend({}, elRect, {
        width: elRect.right - elRect.left,
        height: elRect.bottom - elRect.top
      });
    }
    var elOffset = isBody ? {
      top: 0,
      left: 0
    } : $element.offset();
    var scroll = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() };
    var outerDims = isBody ? {
      width: $(window).width(),
      height: $(window).height()
    } : null;
    return $.extend({}, elRect, scroll, outerDims, elOffset);
  };
  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement === 'bottom' ? {
      top: pos.top + pos.height,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement === 'top' ? {
      top: pos.top - actualHeight,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement === 'left' ? {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left - actualWidth
    } : /* placement == 'right' */
    {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left + pos.width
    };
  };
  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = {
      top: 0,
      left: 0
    };
    if (!this.$viewport) {
      return delta;
    }
    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0;
    var viewportDimensions = this.getPosition(this.$viewport);
    if (/right|left/.test(placement)) {
      var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll;
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight;
      if (topEdgeOffset < viewportDimensions.top) {
        // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset;
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) {
        // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
      }
    } else {
      var leftEdgeOffset = pos.left - viewportPadding;
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth;
      if (leftEdgeOffset < viewportDimensions.left) {
        // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset;
      } else if (rightEdgeOffset > viewportDimensions.right) {
        // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
      }
    }
    return delta;
  };
  Tooltip.prototype.getTitle = function () {
    var title;
    var $e = this.$element;
    var o = this.options;
    title = $e.attr('data-original-title') || (typeof o.title === 'function' ? o.title.call($e[0]) : o.title);
    return title;
  };
  Tooltip.prototype.getUID = function (prefix) {
    do
      prefix += ~~(Math.random() * 1000000);
    while (document.getElementById(prefix));
    return prefix;
  };
  Tooltip.prototype.tip = function () {
    if (!this.$tip) {
      this.$tip = $(this.options.template);
      if (this.$tip.length !== 1) {
        throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!');
      }
    }
    return this.$tip;
  };
  Tooltip.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow');
  };
  Tooltip.prototype.enable = function () {
    this.enabled = true;
  };
  Tooltip.prototype.disable = function () {
    this.enabled = false;
  };
  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled;
  };
  Tooltip.prototype.toggle = function (e) {
    var self = this;
    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type);
      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions());
        $(e.currentTarget).data('bs.' + this.type, self);
      }
    }
    if (e) {
      self.inState.click = !self.inState.click;
      if (self.isInStateTrue()) {
        self.enter(self);
      } else {
        self.leave(self);
      }
    } else {
      self.tip().hasClass('in') ? self.leave(self) : self.enter(self);
    }
  };
  Tooltip.prototype.destroy = function () {
    var that = this;
    clearTimeout(this.timeout);
    this.hide(function () {
      that.$element.off('.' + that.type).removeData('bs.' + that.type);
      if (that.$tip) {
        that.$tip.detach();
      }
      that.$tip = null;
      that.$arrow = null;
      that.$viewport = null;
    });
  };
  // TOOLTIP PLUGIN DEFINITION
  // =========================
  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.tooltip');
      var options = typeof option === 'object' && option;
      if (!data && /destroy|hide/.test(option)) {
        return;
      }
      if (!data) {
        $this.data('bs.tooltip', data = new Tooltip(this, options));
      }
      if (typeof option === 'string') {
        data[option]();
      }
    });
  }
  var old = $.fn.tooltip;
  $.fn.tooltip = Plugin;
  $.fn.tooltip.Constructor = Tooltip;
  // TOOLTIP NO CONFLICT
  // ===================
  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old;
    return this;
  };
}(jQuery);
+function ($) {
  'use strict';
  // Gallery CLASS DEFINITION
  // ======================
  var Gallery = function (element, options) {
    this.$body = $(document.body);
    this.$element = $(element);
    this.imageType = options.imageType;
    this.url = options.url;
    this.urlType = options.type;
    this.deleteUrl = options.deleteUrl;
    this.triggerObj = options.triggerObj;
    this.deleteUrlType = options.deleteType;
    this.fileSize = options.fileSize;
    this.uploadParam = options.uploadParam;
    this.receiveUploadSuccess = options.receiveUploadSuccess;
    this.receiveUploadFailure = options.receiveUploadFailure;
    this.prepareDelete = options.prepareDelete;
    this.receiveDeleteSuccess = options.receiveDeleteSuccess;
    this.receiveDeleteFailure = options.receiveDeleteFailure;
    this.$input = this.$element.find('.gallery-input');
    this.$submit = this.$element.find('.gallery-submit');
    this.$form = this.$element.find('.gallery-form');
    this.$preview = this.$element.find('.gallery-preview-container');
    this.$addBtn = this.$element.find('[data-toggle="gallery-add"]');
    this.$upload = this.$element.find('[data-toggle="gallery-upload"]');
    this.$remove = this.$element.find('[data-toggle="gallery-remove"]');
    this.$multiple = this.$element.find('[data-toggle="gallery-multiple"]');
    this.$multipleClose = this.$element.find('[data-toggle="gallery-multiple-close"]');
    this.$multiAll = this.$element.find('[data-toggle="gallery-all"]');
    this.$multiDelete = this.$element.find('[data-toggle="gallery-delete"]');
    this.$previewTitle = this.$element.find('[data-toggle="gallery-preview-title"]');
    this.$uploaded = this.$element.find('.gallery-uploaded-container');
    this.$uploadedEmpty = this.$element.find('.gallery-uploaded-empty');
    this.limit = options.max;
    this.uploadedHtml = '<div class="gallery-uploaded"><div class="gallery-triangle"><span class="glyphicon glyphicon-ok"></span></div></div>';
    this.previewHtml = '<div class="gallery-preview"><div class="gallery-upload-progress text-center hidden vertical-middle-block"><span class="vertical-middle-block-cell"></span></div><div class="gallery-preview-delete">\u5220\u9664</div></div>';
    this.isShown = null;
    this.selectedCount = 0;
    this.multiSelectedIndex = [];
    this.uploadFiles = [];
    this.uploadSuccess = 0;
    this.uploadError = 0;
    this.uploadedIndex = [];
    this.deleteSelected = [];
  };
  Gallery.VERSION = '0.0.1';
  Gallery.DEFAULTS = {
    show: true,
    max: 10,
    url: '',
    imageType: /^image/,
    urlType: 'POST',
    fileSize: 3145728,
    deleteUrl: '',
    deleteType: 'POST',
    uploadParam: '',
    triggerObj: $('body'),
    receiveUploadSuccess: function (data) {
      return data;
    },
    receiveUploadFailure: function (error) {
    },
    prepareDelete: function (indexs) {
      var param = {};
      param.index = indexs;
      return param;
    },
    receiveDeleteSuccess: function () {
      return true;
    },
    receiveDeleteFailure: function () {
      return true;
    }
  };
  Gallery.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget);
  };
  Gallery.prototype.refresh = function (triggerObj) {
    this.triggerObj = triggerObj;
    this.isShown = true;
    this.selectedCount = 0;
    this.multiSelectedIndex = [];
    this.uploadFiles = [];
    this.uploadSuccess = 0;
    this.uploadError = 0;
    this.uploadedIndex = [];
    this.deleteSelected = [];
    this.$preview.html('');
    this.hide();
    this.show();
  };
  Gallery.prototype.addUploaded = function (paths) {
    var self = this;
    $.each(paths, function (k, v) {
      self.$uploaded.append(self.uploadedHtml);
      var successObj = self.$uploaded.find('.gallery-uploaded:last-child');
      successObj.css('background-image', 'url(' + paths[k] + ')');
    });
  };
  Gallery.prototype.changeUploadParam = function (params) {
    this.uploadParam = params;
  };
  Gallery.prototype.show = function (_relatedTarget) {
    var e = $.Event('show.amos.gallery', { relatedTarget: _relatedTarget });
    this.$element.trigger(e);
    if (this.isShown || e.isDefaultPrevented()) {
      return;
    }
    this.isShown = true;
    this.$element.show();
    this.$element.on('click.amos.gallery.add', '[data-toggle="gallery-add"]', $.proxy(this.btnInput, this));
    this.$element.on('click.amos.gallery.multiple', '[data-toggle="gallery-multiple"]', $.proxy(this.btnMultiple, this));
    this.$element.on('click.amos.gallery.all', '[data-toggle="gallery-all"]', $.proxy(this.btnAll, this));
    this.$element.on('click.amos.gallery.close', '[data-toggle="gallery-multiple-close"]', $.proxy(this.btnMultipleRemove, this));
    this.$element.on('click.amos.gallery.upload', '[data-toggle="gallery-upload"]', $.proxy(this.btnUpload, this));
    this.$element.on('click.amos.gallery.remove', '[data-toggle="gallery-remove"]', $.proxy(this.btnRemove, this));
    this.$element.on('change.amos.gallery.input', '.gallery-input', $.proxy(this.inputChange, this));
    var self = this;
    this.$element.on('mouseover.amos.gallery.preview', '.gallery-preview', function (e) {
      $(this).find('.gallery-preview-delete').show();
    });
    this.$element.on('mouseleave.amos.gallery.preview', '.gallery-preview', function (e) {
      $(this).find('.gallery-preview-delete').hide();
    });
    this.$element.on('click.amos.gallery.delete', '.gallery-preview-delete', function (e) {
      var index = $(this).parent().index();
      self.fileDelete(index, true);
    });
    this.refreshUploaded();
    this.refreshPreview();
  };
  Gallery.prototype.hide = function (e) {
    if (e) {
      e.preventDefault();
    }
    e = $.Event('hide.amos.gallery');
    this.$element.trigger(e);
    if (!this.isShown || e.isDefaultPrevented()) {
      return;
    }
    this.isShown = false;
    this.$element.hide();
    this.$element.off('click.amos.gallery').off('mouseover.amos.gallery').off('mouseleave.amos.gallery');
  };
  Gallery.prototype.refreshPreview = function () {
    if (this.$preview.children().length > 0) {
      this.$upload.removeClass('hidden');
      this.$remove.removeClass('hidden');
      this.$previewTitle.removeClass('hidden');
    } else {
      this.$upload.addClass('hidden');
      this.$remove.addClass('hidden');
      this.$previewTitle.addClass('hidden');
    }
  };
  Gallery.prototype.refreshUploaded = function () {
    if (this.$uploaded.children().length > 0) {
      this.$multiple.removeClass('hidden');
      this.$uploadedEmpty.addClass('hidden');
    } else {
      this.$uploadedEmpty.removeClass('hidden');
      this.$multiple.addClass('hidden');
      this.btnMultipleRemove();
    }
  };
  Gallery.prototype.startUpload = function () {
    var self = this;
    this.uploadSuccess = 0;
    this.uploadError = 0;
    this.uploadedIndex = [];
    this.$upload.addClass('disabled');
    this.$remove.addClass('disabled');
    this.$multiple.addClass('disabled');
    $.each(self.uploadFiles, function (k, v) {
      self.uploadFile(k, v);
    });
  };
  Gallery.prototype.uploadFile = function (index, file) {
    if (!file) {
      return;
    }
    var self = this;
    var formData = new FormData();
    formData.append('file', file);
    // 添加指定的上传参数
    $.each(self.uploadParam, function (k, v) {
      formData.append(k, v);
    });
    var xhr = new XMLHttpRequest();
    // 进度
    xhr.upload.addEventListener('progress', function (e) {
      self.onProgress(e.loaded, e.total, index);
    }, false);
    // 成功
    xhr.addEventListener('load', function (e) {
      if (xhr.status === 200) {
        self.onSuccess(xhr.responseText, index);
      } else {
        self.onFailure(xhr.responseText, index);
      }
      if (self.uploadSuccess + self.uploadError === self.selectedCount) {
        self.onComplete();
      }
    }, false);
    // 失败
    xhr.addEventListener('error', function (request, textStatus) {
      self.onFailure(textStatus, index);
      if (self.uploadSuccess + self.uploadError === self.selectedCount) {
        self.onComplete();
      }
    }, false);
    xhr.open(this.urlType, self.url, true);
    xhr.send(formData);
  };
  Gallery.prototype.onComplete = function () {
    this.$element.trigger('complete.amos.gallery', [
      this.uploadSuccess,
      this.uploadError
    ]);
    this.selectedCount -= this.uploadSuccess;
    this.$upload.removeClass('disabled');
    this.$remove.removeClass('disabled');
    this.$multiple.removeClass('disabled');
  };
  Gallery.prototype.runtimeIndex = function (index) {
    var beforeCount = 0;
    for (var i = 0; i < this.uploadedIndex.length; i++) {
      if (this.uploadedIndex[i] < index) {
        beforeCount++;
      }
    }
    return index - beforeCount;
  };
  Gallery.prototype.onProgress = function (loaded, total, index) {
    index = this.runtimeIndex(index);
    var progressObj = this.$preview.children().eq(index).find('.gallery-upload-progress');
    progressObj.removeClass('hidden');
    // 计算百分比
    var result;
    if (isNaN(loaded) || isNaN(total)) {
      result = '-';
    } else {
      result = loaded / total * 100;
      result = Math.ceil(result);
    }
    progressObj.find('span').html(result + '%');
  };
  Gallery.prototype.onSuccess = function (response, index) {
    this.uploadSuccess++;
    this.$uploaded.append(this.uploadedHtml);
    var successObj = this.$uploaded.find('.gallery-uploaded:last-child');
    var path = this.receiveUploadSuccess(response, successObj, this.triggerObj);
    successObj.css('background-image', 'url(' + path + ')');
    var deleteIndex = this.runtimeIndex(index);
    this.fileDelete(deleteIndex, false);
    this.uploadedIndex.push(index);
    this.refreshUploaded();
  };
  Gallery.prototype.onFailure = function (error, index) {
    this.uploadError++;
    var failureObj = this.$preview.children().eq(index);
    failureObj.addClass('gallery-upload-Error');
    var progressObj = this.$preview.children().eq(index).find('.gallery-upload-progress');
    progressObj.addClass('hidden');
    this.receiveUploadFailure(error, failureObj, this.triggerObj);
  };
  Gallery.prototype.btnInput = function (e) {
    if (this.$addBtn.hasClass('disabled')) {
      return;
    }
    var result = this.limitChecked();
    if (!result) {
      return;
    }
    this.$input.trigger('click');
  };
  Gallery.prototype.limitChecked = function () {
    var uploadedCount = this.$uploaded.children().length;
    if (this.limit <= uploadedCount + this.selectedCount) {
      this.$element.trigger('limit.amos.gallery', [this.limit]);
      return false;
    }
    return true;
  };
  Gallery.prototype.btnMultiple = function (e) {
    if (this.$multiple.hasClass('disabled')) {
      return;
    }
    this.$addBtn.addClass('disabled');
    this.$multiple.addClass('disabled');
    this.$multiAll.removeClass('hidden');
    this.$multipleClose.removeClass('hidden');
    this.$upload.addClass('disabled');
    this.$remove.addClass('disabled');
    var uploadedGlyphicon = this.$uploaded.find('.gallery-triangle .glyphicon');
    uploadedGlyphicon.removeClass('glyphicon-ok');
    uploadedGlyphicon.addClass('glyphicon-unchecked');
    var self = this;
    this.$uploaded.on('click.amos.gallery.glyphicon', '.gallery-uploaded', function () {
      var index = $(this).index();
      var obj = $(this).find('.glyphicon');
      self.btnGlyphCheck(index, !obj.hasClass('glyphicon-check'));
    });
    this.$multiDelete.on('click.amos.gallery.multiDelete', $.proxy(this.btnDeleteClick, this));
  };
  Gallery.prototype.btnMultipleRemove = function (e) {
    var uploadedGlyphicon = this.$uploaded.find('.gallery-triangle .glyphicon');
    uploadedGlyphicon.addClass('glyphicon-ok');
    uploadedGlyphicon.removeClass('glyphicon-unchecked');
    uploadedGlyphicon.removeClass('glyphicon-check');
    this.$uploaded.off('click.amos.gallery.glyphicon');
    this.$multiDelete.off('click.amos.gallery.multiDelete');
    this.$addBtn.removeClass('disabled');
    this.$multiple.removeClass('disabled');
    this.$upload.removeClass('disabled');
    this.$remove.removeClass('disabled');
    this.$multiAll.addClass('hidden');
    this.$multipleClose.addClass('hidden');
    this.$multiDelete.addClass('hidden');
    if (this.$multiAll.find('.glyphicon').hasClass('glyphicon-check')) {
      this.$multiAll.data('checked', false);
      this.$multiAll.find('.glyphicon').removeClass('glyphicon-check');
      this.$multiAll.find('.glyphicon').addClass('glyphicon-unchecked');
    }
  };
  Gallery.prototype.btnGlyphCheck = function (index, check) {
    var obj = this.$uploaded.children().eq(index).find('.glyphicon');
    if (check) {
      obj.addClass('glyphicon-check');
      obj.removeClass('glyphicon-unchecked');
    } else {
      obj.removeClass('glyphicon-check');
      obj.addClass('glyphicon-unchecked');
    }
    var hasChecked = false;
    $.each(this.$uploaded.children(), function (k, v) {
      var obj = $(this).find('.glyphicon');
      if (obj.hasClass('glyphicon-check')) {
        hasChecked = true;
        return false;
      }
    });
    this.btnDeleteToggle(hasChecked);
  };
  Gallery.prototype.btnDeleteToggle = function (show) {
    if (show) {
      this.$multiDelete.removeClass('hidden');
    } else {
      this.$multiDelete.addClass('hidden');
    }
  };
  Gallery.prototype.btnDeleteClick = function (e) {
    var self = this;
    var indexs = [];
    $.each(this.$uploaded.children(), function (k, v) {
      var obj = $(this).find('.glyphicon');
      var index = $(this).index();
      if (obj.hasClass('glyphicon-check')) {
        indexs.push(index);
      }
    });
    if (indexs.length <= 0) {
      return;
    }
    var params = this.prepareDelete(indexs);
    //带上参数
    params.data = self.uploadParam;
    this.deleteSelected = indexs;
    $.ajax({
      url: self.deleteUrl,
      data: params,
      type: self.deleteUrlType,
      cache: false,
      dataType: 'json',
      success: $.proxy(self.deleteSuccess, self),
      error: $.proxy(self.deleteFailure, self)
    });
  };
  Gallery.prototype.deleteSuccess = function (data) {
    var self = this;
    var result = self.receiveDeleteSuccess(data, self.triggerObj);
    if (!result) {
      return;
    }
    this.deleteSelected.sort(function (a, b) {
      return b - a;
    });
    $.each(this.deleteSelected, function (k, v) {
      var index = v;
      self.$uploaded.children().eq(index).remove();
    });
    this.refreshUploaded();
  };
  Gallery.prototype.deleteFailure = function (error) {
    var self = this;
    var result = self.receiveDeleteFailure(error);
    if (!result) {
      return;
    }
  };
  Gallery.prototype.btnAll = function (e) {
    var self = this;
    var checked = self.$multiAll.data('checked');
    checked = !checked;
    var glyphicon = self.$uploaded.find('.glyphicon');
    if (checked) {
      self.$multiAll.find('.glyphicon').addClass('glyphicon-check');
      self.$multiAll.find('.glyphicon').removeClass('glyphicon-unchecked');
      glyphicon.addClass('glyphicon-check');
      glyphicon.removeClass('glyphicon-unchecked');
    } else {
      self.$multiAll.find('.glyphicon').removeClass('glyphicon-check');
      self.$multiAll.find('.glyphicon').addClass('glyphicon-unchecked');
      glyphicon.removeClass('glyphicon-check');
      glyphicon.addClass('glyphicon-unchecked');
    }
    this.btnDeleteToggle(checked);
    self.$multiAll.data('checked', checked);
  };
  Gallery.prototype.btnUpload = function (e) {
    if (this.$upload.hasClass('disabled')) {
      return;
    }
    this.startUpload();
  };
  Gallery.prototype.btnRemove = function (e) {
    if (this.$remove.hasClass('disabled')) {
      return;
    }
    this.$input.val('');
    var self = this;
    this.$preview.children().each(function () {
      self.fileDelete($(this).index(), true);
    });
  };
  Gallery.prototype.inputChange = function (e) {
    var files = !!this.$input[0].files ? this.$input[0].files : [];
    if (!files.length) {
      return;
    }
    if (!window.FileReader) {
      window.alert('\u62B1\u6B49\uFF0C\u60A8\u6240\u4F7F\u7528\u7684\u6D4F\u89C8\u5668\u65E0\u6CD5\u4F7F\u7528\u8BE5\u529F\u80FD\uFF0C\u8BF7\u5728\u5176\u4ED6\u6D4F\u89C8\u5668\u91CD\u8BD5\uFF0C\u63A8\u8350\u4F7F\u7528\u8C37\u6B4C\u6D4F\u89C8\u5668chrome');
      return;
    }
    var self = this;
    files = self.fileFilter(files);
    this.multiSelectedIndex = [];
    var start = this.$preview.children().length;
    $.each(files, function (k, v) {
      self.readFile(k, v, start);
    });
  };
  Gallery.prototype.readFile = function (index, file, start) {
    var self = this;
    var checkResult = this.limitChecked();
    if (!checkResult) {
      return;
    }
    var reader = new FileReader();
    self.$upload.removeClass('hidden');
    self.$remove.removeClass('hidden');
    self.$previewTitle.removeClass('hidden');
    self.selectedCount++;
    self.uploadFiles.push(file);
    reader.readAsDataURL(file);
    reader.onloadend = function (e) {
      self.$preview.append(self.previewHtml);
      var previewObj = self.$preview.find('.gallery-preview:last-child');
      previewObj.css('background-image', 'url(' + this.result + ')');
      var insertIndex = self.multiRuntimeIndex(index);
      if (insertIndex >= 0) {
        previewObj.insertAfter(self.$preview.children().eq(insertIndex + start));
      } else {
        previewObj.insertBefore(self.$preview.children().eq(start));
      }
      self.multiSelectedIndex.push(index);
    };
  };
  Gallery.prototype.multiRuntimeIndex = function (index) {
    var beforeCount = 0;
    for (var i = 0; i < this.multiSelectedIndex.length; i++) {
      if (this.multiSelectedIndex[i] < index) {
        beforeCount++;
      }
    }
    return beforeCount - 1;
  };
  Gallery.prototype.fileDelete = function (index, removeCount) {
    this.$preview.find('.gallery-preview').eq(index).remove();
    this.uploadFiles.splice(index, 1);
    if (removeCount) {
      this.selectedCount--;
    }
    var count = this.$preview.children().length;
    if (count <= 0) {
      this.$previewTitle.addClass('hidden');
      this.$upload.addClass('hidden');
      this.$remove.addClass('hidden');
    }
  };
  Gallery.prototype.fileFilter = function (files) {
    var self = this;
    var tempFiles = [];
    $.each(files, function (k, v) {
      if (v.size > self.fileSize) {
        self.$element.trigger('filesizelimit.amos.gallery', [self.fileSize]);
        return true;
      }
      if (!self.imageType.test(v.type)) {
        self.$element.trigger('imagetype.amos.gallery');
        return true;
      }
      if ($.inArray(v, self.uploadFiles) < 0) {
        tempFiles.push(files[k]);
      }
    });
    return tempFiles;
  };
  // Gallery PLUGIN DEFINITION
  // =======================
  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('amos.gallery');
      var options = $.extend({}, Gallery.DEFAULTS, $this.data(), typeof option === 'object' && option);
      if (!data) {
        $this.data('amos.gallery', data = new Gallery(this, options));
      }
      if (typeof option === 'string') {
        data[option](_relatedTarget);
      } else if (options.show) {
        data.show(_relatedTarget);
      }
    });
  }
  var old = $.fn.gallery;
  $.fn.gallery = Plugin;
  $.fn.gallery.Constructor = Gallery;
  // Gallery NO CONFLICT
  // =================
  $.fn.gallery.noConflict = function () {
    $.fn.gallery = old;
    return this;
  };
}(jQuery);
// tip 插件
// single-line
(function($) {
    'use strict';
    $.fn.tip = function(options) {
        var def = {
            height: 26,
            direction: 3,
            offsetX: 0,
            offsetY: 0,
            align: 'center',
            lineHeight: 18,
            color: '#424242',
            autoClose: true,
            time: 1.5,
            position: 'absolute',
            background: '#ffffff',
            content: 'tip',
            triangleWidth: 5
        };
        // 合并参数
        var opt = $.extend(def, options);
        //计算字符串的宽度
        var con = '<span class="jb_con_len" style="display:none;position:absolute;white-space:nowrap;">' + opt.content + '</span>';
        $('body').append(con);
        var contentWidth = $('.jb_con_len').width();
        var outputWidth = contentWidth + 12;
        var outputHeight = $('.jb_con_len').height() + 8;
        $('.jb_con_len').remove();
        var timer = null;
        //定时器
        return this.each(function() {
            var obj = $(this);
            obj.css({
                position: 'relative'
            });
            var left = obj.offset().left;
            var top = obj.offset().top;
            var objInnerWidth = parseInt(obj.innerWidth());
            var objInnerHeight = parseInt(obj.innerHeight());
            // 三角形的总宽高
            var triangleTotal = opt.triangleWidth * 2;
            // tip Container的left和top值，三角形相对Container的left和top值
            var containerPostionLeft, containerPostionTop, trianglePositionLeft, trianglePostionTop;
            switch (opt.direction) {
                case 2:
                    containerPostionLeft = left + (objInnerWidth - outputWidth) / 2 + opt.offsetX;
                    containerPostionTop = top - opt.height - triangleTotal + opt.offsetY;
                    trianglePositionLeft = (outputWidth - triangleTotal) / 2;
                    trianglePostionTop = opt.height;
                    break;
                case 3:
                    containerPostionLeft = left + objInnerWidth + triangleTotal + opt.offsetX;
                    containerPostionTop = top + (objInnerHeight - opt.height) / 2 + opt.offsetY;
                    trianglePositionLeft = -triangleTotal;
                    trianglePostionTop = (opt.height - triangleTotal) / 2;
                    break;
                case 4:
                    containerPostionLeft = left + (objInnerWidth - outputWidth) / 2 + opt.offsetX;
                    containerPostionTop = top + objInnerHeight + triangleTotal + opt.offsetY;
                    trianglePositionLeft = (outputWidth - triangleTotal) / 2;
                    trianglePostionTop = -triangleTotal;
                    break;
                case 1:
                default:
                    containerPostionLeft = left - outputWidth - triangleTotal + opt.offsetX;
                    containerPostionTop = top + (objInnerHeight - opt.height) / 2 + opt.offsetY;
                    trianglePositionLeft = outputWidth;
                    trianglePostionTop = (opt.height - triangleTotal) / 2;
                    break;
            }
            if (opt.position === 'fixed') {
                containerPostionTop -= parseInt($(window).scrollTop());
            }
            // 如果obj没有赋予tip的id就赋予新id
            var objId = obj.attr('data-tooltip-plugin-id');
            if (objId === null) {
                objId = new Date().getTime();
                obj.attr('data-tooltip-plugin-id', objId);
            }
            // container div以及其css属性
            var css = 'box-sizing: content-box;text-align:center;box-shadow: 0 0 4px #ddd;position:' + opt.position + ';z-index:2;border:1px solid #ddd;border-radius:3px;background:' + opt.background + ';left:' + containerPostionLeft + 'px;top:' + containerPostionTop + 'px;';
            css += 'width:' + outputWidth + 'px;height:' + opt.height + 'px;display:none;z-index:10004;line-height:12px;';
            var html = '<div class="jb_tip" data-id="' + objId + '" style="' + css + '">';
            // 根据direction画不同direction的三角形
            var triangleBorder = '';
            switch (opt.direction) {
                case 1:
                    triangleBorder = 'transparent transparent transparent ' + opt.background;
                    break;
                case 2:
                    triangleBorder = opt.background + ' transparent transparent transparent';
                    break;
                case 3:
                    triangleBorder = 'transparent ' + opt.background + ' transparent transparent';
                    break;
                case 4:
                    triangleBorder = 'transparent transparent ' + opt.background + ' transparent';
                    break;
                default:
                    break;
            }
            // 三角形
            html += '<b style="width: 0;height: 0;border-width: ' + opt.triangleWidth + 'px;padding: 0;font-size: 0;line-height: 0;border-style: solid;border-color: ' + triangleBorder + ';position: absolute;left: ' + trianglePositionLeft + 'px;top:' + trianglePostionTop + 'px;z-index: 99;"></b>';
            // 内容，上下padding为4，左右padding为6
            html += '<div style="box-sizing: content-box;width:' + contentWidth + 'px;vertical-align:middle;padding:4px 6px;line-height:' + opt.lineHeight + 'px;text-align:' + opt.align + ';color:' + opt.color + ';">' + opt.content + '</div></div>';
            // 移除同一个obj的tip
            $('.jb_tip[data-id=' + objId + ']').remove();
            // 显示新的tip
            $('body').append(html);
            var tipObj = $('.jb_tip[data-id=' + objId + ']');
            tipObj.fadeIn(100);
            // 判定是否启用自动关闭
            if (opt.autoClose) {
                //自动关闭
                autoClose(tipObj, opt.callBack);
            }
            // 当鼠标停留在tip上时候清空关闭倒计时
            tipObj.mouseenter(function() {
                if (timer !== null) {
                    clearTimeout(timer);
                }
            }).mouseleave(function() {
                if (opt.autoClose) {
                    autoClose(tipObj, opt.callBack);
                }
            });
        });
        // 自动关闭函数
        function autoClose(obj, callBack) {
            timer = setTimeout(function() {
                obj.animate({
                    opacity: 0
                }, 500, function() {
                    obj.remove();
                    setTimeout(function() {
                        if (callBack !== undefined) {
                            callBack();
                        }
                    }, 300);
                }); //obj.fadeOut(600).remove();
            }, opt.time * 1000);
        }
    };
}(jQuery));

+function ($) {
  'use strict';
  // FileUpload CLASS DEFINITION : for ajax upload
  // ======================
  var FileUpload = function (element, options) {
    this.options = options;
    this.containerObj = $(element);
    this.triggerObj = this.containerObj.find(FileUpload.CLASS.trigger);
    this.inputObj = this.containerObj.find(FileUpload.CLASS.input);
    this.startObj = this.containerObj.find(FileUpload.CLASS.start);
    this.progressObj = this.containerObj.find(FileUpload.CLASS.progress);
    this.resultObj = this.containerObj.find(FileUpload.CLASS.result);
    this.isUploading = false;
    this.uploadParam = {};
    this.init();
  };
  FileUpload.VERSION = '0.0.1';
  FileUpload.DEFAULTS = {
    url: '',
    fileType: /^image/,
    urlType: 'POST',
    dataType: 'json',
    fileSize: 3145728,
    autoUpload: false,
    parentId: 'body',
    success: function (data, trigger, result) {
    },
    failure: function (textStatus, trigger) {
    },
    complete: function (trigger) {
    }
  };
  FileUpload.EVENTS = {
    choose: 'choose.amos.fileupload',
    chosed: 'chosed.amos.fileupload',
    size: 'sizeerror.amos.fileupload',
    type: 'typeerror.amos.fileupload',
    start: 'start.amos.fileupload'
  };
  FileUpload.CLASS = {
    container: '.fileUpload',
    trigger: '.fileUploadTrigger',
    start: '.fileUploadStart',
    input: '.fileUploadInput',
    progress: '.fileUploadProgress',
    result: '.fileUploadResult',
    hidden: 'hidden'
  };
  FileUpload.prototype.init = function () {
    this.isUploading = false;
    this.progressObj.addClass(FileUpload.CLASS.hidden);
    this.triggerObj.removeClass(FileUpload.CLASS.hidden);
    this.startObj.prop('disabled', true);
    this.containerObj.on('click.amos.fileupload.trigger', FileUpload.CLASS.trigger, $.proxy(this.choose, this));
    this.containerObj.on('change.amos.fileupload.input', FileUpload.CLASS.input, $.proxy(this.chosed, this));
    this.containerObj.on('click.amos.fileupload.start', FileUpload.CLASS.start, $.proxy(this.startUpload, this));
  };
  FileUpload.prototype.choose = function () {
    var e = $.Event(FileUpload.EVENTS.choose);
    this.containerObj.trigger(e);
    if (e.isDefaultPrevented()) {
      return;
    }
    this.inputObj.trigger('click');
  };
  FileUpload.prototype.chosed = function () {
    var e = $.Event(FileUpload.EVENTS.chosed);
    this.containerObj.trigger(e);
    if (e.isDefaultPrevented()) {
      return;
    }
    this.startObj.prop('disabled', false);
    if (this.options.autoUpload) {
      this.startObj.trigger('click');
    }
  };
  FileUpload.prototype.filter = function () {
    var files = !!this.inputObj[0].files ? this.inputObj[0].files : [];
    var file = files[0];
    if (file.size > this.options.fileSize) {
      this.containerObj.trigger(FileUpload.EVENTS.size, [this.options.fileSize]);
      return false;
    }
    if (!this.options.fileType.test(file.type)) {
      this.containerObj.trigger(FileUpload.EVENTS.type, [this.options.fileType]);
      return false;
    }
    return true;
  };
  FileUpload.prototype.startUpload = function () {
    var disabled = this.startObj.prop('disabled');
    if (disabled && this.isUploading) {
      return;
    }
    var result = this.filter();
    if (!result) {
      return;
    }
    var files = !!this.inputObj[0].files ? this.inputObj[0].files : [];
    var file = files[0];
    if (file === '') {
      return;
    }
    var e = $.Event(FileUpload.EVENTS.start);
    this.containerObj.trigger(e);
    if (e.isDefaultPrevented()) {
      return;
    }
    this.isUploading = true;
    this.progressObj.removeClass(FileUpload.CLASS.hidden);
    this.resultObj.addClass(FileUpload.CLASS.hidden);
    this.uploadFile(file);
  };
  FileUpload.prototype.changeUploadParam = function (params) {
    this.uploadParam = params;
  };
  FileUpload.prototype.uploadFile = function (file) {
    if (!file) {
      return;
    }
    var self = this;
    var formData = new FormData();
    formData.append('file', file);
    $.each(self.uploadParam, function (k, v) {
      formData.append(k, v);
    });
    var xhr = new XMLHttpRequest();
    // 成功
    xhr.addEventListener('load', function (e) {
      if (xhr.status === 200) {
        self.onSuccess(xhr.responseText);
      } else {
        self.onFailure(xhr.responseText);
      }
      self.onComplete();
    }, false);
    // 失败
    xhr.addEventListener('error', function (request, textStatus) {
      self.onFailure(textStatus);
      self.onComplete();
    }, false);
    xhr.open(this.options.urlType, this.options.url, true);
    xhr.send(formData);
  };
  FileUpload.prototype.onSuccess = function (data) {
    this.startObj.prop('disabled', true);
    if (this.options.dataType === 'json') {
      data = $.parseJSON(data);
    }
    this.options.success(data, this.triggerObj, this.resultObj);
  };
  FileUpload.prototype.onFailure = function (textStatus) {
    this.options.failure(textStatus, this.triggerObj);
  };
  FileUpload.prototype.onComplete = function () {
    this.isUploading = false;
    this.progressObj.addClass(FileUpload.CLASS.hidden);
    this.resultObj.removeClass(FileUpload.CLASS.hidden);
    this.options.complete();
  };
  // FileUpload PLUGIN DEFINITION
  // =======================
  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('amos.fileupload');
      var options = $.extend({}, FileUpload.DEFAULTS, $this.data(), typeof option === 'object' && option);
      if (!data) {
        $this.data('amos.fileupload', data = new FileUpload(this, options));
      }
      if (typeof option === 'string') {
        data[option](_relatedTarget);
      }
    });
  }
  var old = $.fn.fileUpload;
  $.fn.fileUpload = Plugin;
  $.fn.fileUpload.Constructor = FileUpload;
  // FileUpload NO CONFLICT
  // =================
  $.fn.fileUpload.noConflict = function () {
    $.fn.fileUpload = old;
    return this;
  };
}(jQuery);
+ function ($) {
    'use strict';

    var InputValidate = function (element, options) {
        this.options = options;
        this.parentDom = $(element);
        this.submit = this.options.submit;
        this.inputs = this.options.inputs;
        this.init();
    };
    InputValidate.VERSION = '0.0.1';
    InputValidate.EVENTS = {
        parent: '.amos.inputValidate',
        blur: 'blur.amos.inputValidate',
        click: 'click.amos.inputValidate',
        successSubmit: 'successSubmit.amos.inputValidate',
        errorSubmit: 'errorSubmit.amos.inputValidate',
        beforeSubmit: 'beforeSubmit.amos.inputValidate',
        beforeBlur: 'beforeBlur.amos.inputValidate',
        afterBlur: 'afterBlur.amos.inputValidate',
        warning: 'warning.amos.inputValidate',
        success: 'success.amos.inputValidate',
        error: 'error.amos.inputValidate'
    };
    InputValidate.DEFAULTS = {
        submit: {},
        inputs: []
    };
    InputValidate.TYPE = {
        warning: 'warning',
        success: 'success',
        error: 'error'
    };
    InputValidate.DATA = {
        tipObject: 'tip-object'
    };
    InputValidate.CLASS = {
        formSuccess: 'has-success',
        formWarning: 'has-warning',
        formError: 'has-error',
        queryFormGroup: '.form-group',
        queryHelpBlock: '.help-block'
    };
    InputValidate.prototype = {
        constructor: InputValidate,
        regexp: {
            'mobile': {

            },
        },
        init: function () {
            this.reset();
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];

                // 默认值设置
                if (input.emptyMessage === undefined) {
                    input.emptyMessage = input.message;
                }

                this.parentDom.on(InputValidate.EVENTS.blur, input.query, $.proxy(this.blur, this, input));
            }

            this.submit.obj = $(this.submit.query);
            this.submit.obj.on(InputValidate.EVENTS.click, $.proxy(this.submitClick, this));
        },
        reset: function () {
            this.parentDom.off(InputValidate.EVENTS.parent);
        },
        submitClick: function (e) {
            e.preventDefault();
            var submitBtn = this.submit.obj;
            if (submitBtn.attr('disabled') !== undefined) {
                return false;
            }

            var beforeEvent = $.Event(InputValidate.EVENTS.beforeSubmit);
            submitBtn.trigger(beforeEvent);
            if (beforeEvent.isDefaultPrevented()) {
                return;
            }

            var input = {};
            var result = true;
            var that = this;
            for (var i = 0; i < this.inputs.length; i++) {
                input = this.inputs[i];
                $.each(this.parentDom.find(input.query), function (index, eachItem) {
                    result = that.validateInput(input, $(eachItem), false);
                    if (!result) {
                        return false;
                    }
                });
                if (!result) {
                    break;
                }
            }

            if (result) {
                submitBtn.trigger(InputValidate.EVENTS.successSubmit);
            } else {
                submitBtn.trigger(InputValidate.EVENTS.errorSubmit);
            }
        },
        blur: function (input, e) {
            var obj = $(e.currentTarget);
            var beforeEvent = $.Event(InputValidate.EVENTS.beforeBlur);
            obj.trigger(beforeEvent);
            if (beforeEvent.isDefaultPrevented()) {
                return;
            }

            var result = this.validateInput(input, obj, true);

            obj.trigger(InputValidate.EVENTS.afterBlur, result);
        },
        validateInput: function (input, obj, isFromBlur) {
            // 是否自动去除两边的空格，默认为true
            var enableTrim = (input.trim !== false);
            var data = obj.val();
            if (enableTrim) {
                data = data.trim();
                obj.val(data);
            }

            // 是否允许为空
            var emptiable = (input.required === false);


            var regexp = input.regexp;
            var regexpResult = this.validateData(data, regexp);
            var result = true;
            switch (regexpResult) {
                case 0:
                    result = false;
                    this.tip(obj, input.message);
                    break;
                case -1:
                    result = emptiable;
                    if (!isFromBlur) {
                        if (result) {
                            this.tipReset(obj);
                        } else {
                            this.tip(obj, input.emptyMessage);
                        }
                    }
                    break;
                case 1:
                    result = true;
                    this.tipReset(obj);
                    break;
                default:
                    break;

            }

            if (result && input.warningRegexp !== undefined) {
                regexpResult = this.validateData(data, input.warningRegexp);
                if (regexpResult === 1) {
                    this.tip(obj, input.warningMessage, InputValidate.TYPE.warning);
                }
            }


            return result;
        },
        tip: function (obj, info, type) {
            if (type === undefined) {
                type = InputValidate.TYPE.error;
            }
            var tipClass = '';
            switch (type) {
                case InputValidate.TYPE.warning:
                    tipClass = InputValidate.CLASS.formWarning;
                    break;
                case InputValidate.TYPE.success:
                    tipClass = InputValidate.CLASS.formSuccess;
                    break;
                case InputValidate.TYPE.error:
                    tipClass = InputValidate.CLASS.formError;
                    break;
                default:
                    break;
            }

            // 检测data中是否定义了显示提示的另一个位置
            var tipObjectQueryStr = obj.data(InputValidate.DATA.tipObject);
            var tipObject = $(tipObjectQueryStr);
            var hasTipObject = tipObject.length !== 0;
            if (hasTipObject) {
                obj.parents(InputValidate.CLASS.queryFormGroup).addClass(tipClass);
            } else {
                tipObject = obj;
            }

            var formGroupObj = tipObject.parents(InputValidate.CLASS.queryFormGroup);
            var helpBlock = formGroupObj.find(InputValidate.CLASS.queryHelpBlock);
            helpBlock.html(info);
            formGroupObj.addClass(tipClass);
        },
        tipReset: function (obj) {
            var tipObjectQueryStr = obj.data(InputValidate.DATA.tipObject);
            var tipObject = $(tipObjectQueryStr);
            var hasTipObject = tipObject.length !== 0;
            if (hasTipObject) {
                var objParentFormItem = obj.parents(InputValidate.CLASS.queryFormGroup);
                objParentFormItem.removeClass(InputValidate.CLASS.formWarning);
                objParentFormItem.removeClass(InputValidate.CLASS.formError);
                objParentFormItem.removeClass(InputValidate.CLASS.formSuccess);
            } else {
                tipObject = obj;
            }

            var formGroupObj = tipObject.parents(InputValidate.CLASS.queryFormGroup);
            formGroupObj.removeClass(InputValidate.CLASS.formWarning);
            formGroupObj.removeClass(InputValidate.CLASS.formError);
            formGroupObj.removeClass(InputValidate.CLASS.formSuccess);
        },
        validateData: function (data, regexp) {
            if (regexp === null) {
                regexp = /^.*$/;
            }
            if (data === null) {
                return -1;
            }

            if (regexp.test(data)) {
                return 1;
            } else {
                if (data.length === 0) {
                    return -1;
                }
                return 0;
            }
        },
    };

    // InputValidate PLUGIN DEFINITION
    // =======================
    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('amos.inputValidate');
            var options = $.extend({}, InputValidate.DEFAULTS, $this.data(), typeof option === 'object' && option);
            if (!data) {
                $this.data('amos.inputValidate', data = new InputValidate(this, options));
            }
            if (typeof option === 'string') {
                data[option](_relatedTarget);
            }
        });
    }
    var old = $.fn.inputValidate;
    $.fn.inputValidate = Plugin;
    $.fn.inputValidate.Constructor = InputValidate;
    // InputValidate NO CONFLICT
    // =================
    $.fn.inputValidate.noConflict = function () {
        $.fn.inputValidate = old;
        return this;
    };
}(jQuery);

+ function($) {
    'use strict';

    var InputAction = function(element, options) {
        this.options = options;
        this.parentDom = $(element);
        this.init();
    };
    InputAction.VERSION = '0.0.1';
    InputAction.EVENTS = {
        parent: '.amos.inputAction',
        focus: 'focus.amos.inputAction',
        blur: 'blur.amos.inputAction',
        touch: 'touchstart.amos.inputAction',
        click: 'click.amos.inputAction',
        change: 'input.amos.inputAction propertychange.amos.inputAction',
    };
    InputAction.DEFAULTS = {
        global: false,
    };
    InputAction.CLASS = {
        hidden: 'hidden',
        clear: '.input-action-clear',
        clearTrigger: '.input-trigger-clear',
        password: '.input-action-password',
        passwordTrigger: '.input-trigger-password',
    };
    InputAction.TYPE = {
        clear: 1,
        password: 2
    }
    InputAction.prototype = {
        constructor: InputAction,
        init: function() {
            this.reset();
            if (!this.options.global) {
                return;
            }
            this.parentDom.on(InputAction.EVENTS.change, InputAction.CLASS.clear, $.proxy(this.change, this));
            this.parentDom.on(InputAction.EVENTS.focus, InputAction.CLASS.clear, $.proxy(this.focus, this));
            this.parentDom.on(InputAction.EVENTS.blur, InputAction.CLASS.clear, $.proxy(this.blur, this));
            this.parentDom.on(InputAction.EVENTS.click, InputAction.CLASS.clearTrigger, $.proxy(this.click, this, InputAction.TYPE.clear));
            this.parentDom.on(InputAction.EVENTS.touch, InputAction.CLASS.clearTrigger, $.proxy(this.click, this, InputAction.TYPE.clear));
            this.parentDom.on(InputAction.EVENTS.click, InputAction.CLASS.passwordTrigger, $.proxy(this.click, this, InputAction.TYPE.password));
        },
        reset: function() {
            this.parentDom.off(InputAction.EVENTS.parent);
        },
        click: function(type, e) {
            var obj = $(e.currentTarget);
            var siblingInput = null;
            switch (type) {
                case InputAction.TYPE.clear:
                    siblingInput = obj.siblings(InputAction.CLASS.clear);
                    siblingInput.val('');
                    obj.addClass(InputAction.CLASS.hidden);
                    break;
                case InputAction.TYPE.password:
                    siblingInput = obj.siblings(InputAction.CLASS.password);
                    var currentType = siblingInput.attr('type');
                    if (currentType === 'password') {
                        obj.addClass('on');
                        siblingInput.attr('type', 'text');
                    } else {
                        obj.removeClass('on');
                        siblingInput.attr('type', 'password');
                    }
                    break;
                default:
                    break;
            }
        },
        change: function(e) {
            var obj = $(e.currentTarget);
            var siblingTrigger = obj.siblings(InputAction.CLASS.clearTrigger);
            if (obj.val() != null && obj.val().length > 0) {
                siblingTrigger.removeClass(InputAction.CLASS.hidden);
            } else {
                siblingTrigger.addClass(InputAction.CLASS.hidden);
            }
        },
        focus: function(e) {
            var obj = $(e.currentTarget);
            var siblingTrigger = obj.siblings(InputAction.CLASS.clearTrigger);
            if (obj.val() != null && obj.val().length > 0) {
                siblingTrigger.removeClass(InputAction.CLASS.hidden);
            } else {
                siblingTrigger.addClass(InputAction.CLASS.hidden);
            }
        },
        blur: function(e) {
            var obj = $(e.currentTarget);
            var relatedTarget = e.relatedTarget;
            if (!relatedTarget) {
                window.setTimeout(function() {
                    obj.siblings(InputAction.CLASS.clearTrigger).addClass(InputAction.CLASS.hidden);
                }, 500);
            } else {
                obj.siblings(InputAction.CLASS.clearTrigger).addClass(InputAction.CLASS.hidden);
            }
        },

    };

    // InputAction PLUGIN DEFINITION
    // =======================
    function Plugin(option, _relatedTarget) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('amos.inputAction');
            var options = $.extend({}, InputAction.DEFAULTS, $this.data(), typeof option === 'object' && option);
            if (!data) {
                $this.data('amos.inputAction', data = new InputAction(this, options));
            }
            if (typeof option === 'string') {
                data[option](_relatedTarget);
            }
        });
    }
    var old = $.fn.inputAction;
    $.fn.inputAction = Plugin;
    $.fn.inputAction.Constructor = InputAction;
    // InputAction NO CONFLICT
    // =================
    $.fn.inputAction.noConflict = function() {
        $.fn.inputAction = old;
        return this;
    };
}(jQuery);
