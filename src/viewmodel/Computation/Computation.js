import warn from 'utils/warn';
import runloop from 'global/runloop';
import Watcher from 'viewmodel/Computation/Watcher';

var Computation = function ( ractive, key, signature ) {
	this.ractive = ractive;
	this.key = key;

	this.getter = signature.get;
	this.setter = signature.set;

	this.watchers = [];

	this.update();
};

Computation.prototype = {
	set: function ( value ) {
		if ( this.setting ) {
			this.value = value;
			return;
		}

		if ( !this.setter ) {
			throw new Error( 'Computed properties without setters are read-only in the current version' );
		}

		this.setter.call( this.ractive, value );
	},

	// returns `false` if the computation errors
	compute: function () {
		var ractive, errored;

		ractive = this.ractive;
		ractive.viewmodel.capture();

		try {
			this.value = this.getter.call( ractive );
		} catch ( err ) {
			if ( ractive.debug ) {
				warn( 'Failed to compute "' + this.key + '": ' + err.message || err );
			}

			errored = true;
		}

		diff( this, this.watchers, ractive.viewmodel.release() );

		return errored ? false : true;
	},

	update: function () {
		if ( this.compute() ) {
			this.setting = true;
			this.ractive.viewmodel.set( this.key, this.value );
			this.setting = false;
		}

		this.dirty = false;
	},

	bubble: function () {
		if ( this.watchers.length <= 1 ) {
			this.update();
		}

		else if ( !this.dirty ) {
			runloop.modelUpdate( this );
			this.dirty = true;
		}
	}
};

function diff ( computation, watchers, newDependencies ) {
	var i, watcher, keypath;

	// remove dependencies that are no longer used
	i = watchers.length;
	while ( i-- ) {
		watcher = watchers[i];

		if ( !newDependencies[ watcher.keypath ] ) {
			watchers.splice( i, 1 );
			watchers[ watcher.keypath ] = null;

			watcher.teardown();
		}
	}

	// create references for any new dependencies
	i = newDependencies.length;
	while ( i-- ) {
		keypath = newDependencies[i];

		if ( !watchers[ keypath ] ) {
			watcher = new Watcher( computation, keypath );
			watchers.push( watchers[ keypath ] = watcher );
		}
	}
}

export default Computation;