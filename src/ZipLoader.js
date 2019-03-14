import parseZip from './parseZip.js';
import PromiseLike from './PromiseLike.js';
let count = 0;
let THREE;

const ZipLoader = class ZipLoader {

	static unzip( blobOrFile ) {

		return new PromiseLike( ( resolve ) => {

			const instance = new ZipLoader();
			const fileReader = new FileReader();

			fileReader.onload = ( event ) => {

				const arrayBuffer = event.target.result;
				instance.files = parseZip( arrayBuffer );
				resolve( instance );

			};

			if ( blobOrFile instanceof Blob ) {

				fileReader.readAsArrayBuffer( blobOrFile );

			}

		} );

	}

	constructor( url ) {

		this._id = count;
		this._listeners = {};
		this.url = url;
		this.files = null;
		count ++;

	}

	load() {

		return new PromiseLike( ( resolve ) => {

			const startTime = Date.now();
			const xhr = new XMLHttpRequest();
			xhr.open( 'GET', this.url, true );
			xhr.responseType = 'arraybuffer';

			xhr.onprogress = ( e ) => {

				this.dispatch( {
					type: 'progress',
					loaded: e.loaded,
					total: e.total,
					elapsedTime: Date.now() - startTime
				} );

			};

			xhr.onload = () => {

				this.files = parseZip( xhr.response );
				this.dispatch( {
					type: 'load',
					elapsedTime: Date.now() - startTime
				} );
				resolve();

			};

			xhr.onerror = ( event ) => {

				this.dispatch( {
					type: 'error',
					error: event
				} );

			};

			xhr.send();

		} );

	}

	on( type, listener ) {

		if ( ! this._listeners[ type ] ) {

			this._listeners[ type ] = [];

		}

		if ( this._listeners[ type ].indexOf( listener ) === - 1 ) {

			this._listeners[ type ].push( listener );

		}

	}

	off( type, listener ) {

		const listenerArray = this._listeners[ type ];

		if ( !! listenerArray ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	dispatch( event ) {

		const listenerArray = this._listeners[ event.type ];

		if ( !! listenerArray ) {

			event.target = this;
			const length = listenerArray.length;

			for ( let i = 0; i < length; i ++ ) {

				listenerArray[ i ].call( this, event );

			}

		}

	}

	clear( filename ) {

		if ( !! filename ) {

			URL.revokeObjectURL( this.files[ filename ].url );
			delete this.files[ filename ];
			return;

		}

		for ( let key in this.files ) {

			URL.revokeObjectURL( this.files[ key ].url );

		}

		delete this.files;

	}

	static install( option ) {

	}

};

export default ZipLoader;
