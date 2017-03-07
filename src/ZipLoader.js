import parseZip from './parseZip.js';
let count = 0;
let THREE;

const ZipLoader = class ZipLoader {

	constructor ( url ) {

		this._id = count;
		this._listeners = {};
		this.url = url;
		this.files = null;
		count ++;

	}

	load () {

		const xhr = new XMLHttpRequest();
		xhr.open( 'GET', this.url, true );
		xhr.responseType = 'arraybuffer';

		xhr.onprogress = ( e ) => {

			this.dispatch( {
				type: 'progress',
				loaded: e.loaded,
				total: e.total
			} );

		};

		xhr.onload = ( e ) => {

			this.files = parseZip( xhr.response );
			this.dispatch( { type: 'load' } );

		};

		xhr.send();

	}

	extractAsBlobUrl ( filename, type ) {

		const blob = new Blob( [ this.files[ filename ].data ], { type: type } );
		this.files[ filename ].url = URL.createObjectURL( blob );
		return this.files[ filename ].url;

	}

	extractAsText ( filename ) {

		let str = '';

		for ( let i = 0, l = this.files[ filename ].data.length; i < l; i++ ) {

			str += String.fromCharCode( this.files[ filename ].data[ i ] );

		};

		return str;

	}

	extractAsJSON ( filename ) {

		return JSON.parse( this.extractAsText( filename ) );

	}

	loadThreeJson ( filename ) {

		const pattern = `__ziploader_${ this._id }__`;
		const regex   = new RegExp( pattern );

		if ( !THREE.Loader.Handlers.handlers.indexOf( regex ) !== -1 ) {

			THREE.Loader.Handlers.add(
				regex,
				{
					load: ( filename ) => {

						return this.loadThreeTexture( filename.replace( regex, '' ) );

					}
				}
			);

		}

		const json = this.extractAsJSON( filename );
		const dirName = filename.replace( /\/.+\.json$/, '/' );
		return THREE.JSONLoader.prototype.parse( json, pattern + dirName );

	}

	loadThreeTexture ( path ) {

		const texture = new THREE.Texture();
		const type = ( /\.jpg$/ ).test( path ) ? 'image/jpeg' :
		             ( /\.png$/ ).test( path ) ? 'image/png' :
		             ( /\.gif$/ ).test( path ) ? 'image/gif' :
		             'unknown';

		const arraybuffer = this.files[ path ].data;
		const blob = new Blob( [ arraybuffer ], { type: type } );
		texture.image = new Image();

		texture.image.onload = () => {

			texture.needsUpdate = true;
			URL.revokeObjectURL( texture.image.src );

		}

		texture.image.src = URL.createObjectURL( blob );
		return texture;

	}

	on ( type, listener ) {

		if ( !this._listeners[ type ] ) {

			this._listeners[ type ] = [];

		}

		if ( this._listeners[ type ].indexOf( listener ) === - 1 ) {

			this._listeners[ type ].push( listener );

		}

	}

	off ( type, listener ) {

		const listenerArray = this._listeners[ type ];

		if ( !!listenerArray ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	dispatch ( event ) {

		const listenerArray = this._listeners[ event.type ];

		if ( !!listenerArray ) {

			event.target = this;

			let i = 0;
			const array = [];
			const length = listenerArray.length;

			for ( i = 0; i < length; i ++ ) {

				array[ i ] = listenerArray[ i ];

			}

			for ( i = 0; i < length; i ++ ) {

				array[ i ].call( this, event );

			}

		}

	}

	clear ( filename ) {

		if ( !!filename ) {

			URL.revokeObjectURL( this.files[ filename ].url );
			delete this.files[ filename ];
			return;

		}

		for ( let key in this.files ) {

			URL.revokeObjectURL( this.files[ key ].url );

		}

		delete this.files;

		if ( !!THREE ) {

			const pattern = `__ziploader_${ this._id }__`;

			THREE.Loader.Handlers.handlers.some( ( el, i ) => {

				if( el instanceof RegExp && el.source === pattern ) {

					THREE.Loader.Handlers.handlers.splice( i, 2 );
					return true;

				}

			} );

		}

	}

}

ZipLoader.use = ( option ) => {

	if ( !!option.THREE ) { THREE = option.THREE; }

}

export default ZipLoader;
