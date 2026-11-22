( function () {
	'use strict';

	function init( root ) {
		var input = root.querySelector( '.ab-area__input' );
		var out = root.querySelector( '.ab-area__result' );
		var towns;
		var messages;

		try {
			towns = JSON.parse( root.getAttribute( 'data-towns' ) || '[]' );
			messages = JSON.parse( root.getAttribute( 'data-messages' ) || '{}' );
		} catch ( e ) {
			return;
		}
		if ( ! input || ! out ) {
			return;
		}

		function fill( template, values ) {
			var i = 0;
			return template.replace( /%(\d\$)?s/g, function () {
				return values[ i++ ];
			} );
		}

		function check() {
			var value = input.value.trim().toLowerCase();
			var match = null;
			out.textContent = '';
			out.removeAttribute( 'data-state' );
			root.querySelectorAll( '.ab-area__list li' ).forEach( function ( li ) {
				li.classList.remove( 'is-match' );
			} );
			if ( value.length < 3 ) {
				return;
			}
			towns.forEach( function ( t ) {
				if ( ! match && t.name.toLowerCase() === value ) {
					match = t;
				}
			} );
			if ( match ) {
				out.textContent = match.day
					? fill( messages.found, [ match.name, match.day ] )
					: fill( messages.foundAny, [ match.name ] );
				out.setAttribute( 'data-state', 'yes' );
				root.querySelectorAll( '.ab-area__list li' ).forEach( function ( li ) {
					if ( li.querySelector( '.ab-area__town' ).textContent === match.name ) {
						li.classList.add( 'is-match' );
					}
				} );
			} else if ( towns.every( function ( t ) { return t.name.toLowerCase().indexOf( value ) !== 0; } ) ) {
				out.textContent = messages.missing;
				out.setAttribute( 'data-state', 'no' );
			}
		}

		input.addEventListener( 'input', check );
		input.addEventListener( 'change', check );
	}

	document.querySelectorAll( '[data-ab-area]' ).forEach( init );
}() );
