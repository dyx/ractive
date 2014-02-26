define([
	'circular',
	'global/failedLookups',
	'shared/createComponentBinding',
	'Ractive/prototype/shared/replaceData'
], function (
	circular,
	failedLookups,
	createComponentBinding,
	replaceData
) {

	'use strict';

	var get;

	circular.push( function () {
		get = circular.get;
	});

	return function getFromParent ( child, keypath ) {
		var parent, fragment, keypathToTest, value;

		parent = child._parent;

		if ( failedLookups( child._guid + keypath ) ) {
			return;
		}

		fragment = child.component.parentFragment;
		do {
			if ( !fragment.context ) {
				continue;
			}

			keypathToTest = fragment.context + '.' + keypath;
			value = get( parent, keypathToTest );

			if ( value !== undefined ) {
				createLateComponentBinding( parent, child, keypathToTest, keypath, value );
				return value;
			}
		} while ( fragment = fragment.parent );

		value = get( parent, keypath );
		if ( value !== undefined ) {
			createLateComponentBinding( parent, child, keypath, keypath, value );
			return value;
		}

		// Short-circuit this process next time
		failedLookups.add( child._guid + keypath );
	};

	function createLateComponentBinding ( parent, child, parentKeypath, childKeypath, value ) {
		replaceData( child, childKeypath, value );
		createComponentBinding( child.component, parent, parentKeypath, childKeypath );
	}

});