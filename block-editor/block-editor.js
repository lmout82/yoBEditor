//**********************************************************************************************
//                                        block-editor.js
//
// Author(s): lmout82
// BEDITOR version 1.0 beta
// Licence:  MIT License
// Link: https://github.com/lmout82/yoBEditor.git
// Creation date: August 2016
// Last modification date: October 2016
//***********************************************************************************************


/**************************************************************************************\
| This is the entry point. The entire BEditor code runs under this object (singleton). | 
\**************************************************************************************/

if ( !window.BEDITOR )
{
	window.BEDITOR = ( function () {
	
		var BEDITOR = {

			/**
		 	 * Variables and settlers
			 * 
			 */
					
			selectTypeCellDialog: null,
			CellMenuShown: {name: ''},
			
			textareaId: null,
			formId:     null,
			
			isEditingModeEnabled: false,
			
			copypast: null,

			// Set the id of the form and of the textarea to be replaced by the editor. 
			replace: function ( formId, textareaId )
			{
				if( formId != null && textareaId != null )
				{
					this.formId = formId;
					this.textareaId = textareaId;
				}					
			},


			/**
		 	 * Utilities
			 * 
			 */
			 
			// Append the editor code to the form. 
			insertEditor: function ()
			{
				// Generate the code
				var html = ' \
				<div id="beditor-wrapper"> \
					<div id="beditor-buttons-wrapper">';
					
				var buttons = this.buttonRegistry.getButtonsInfo ();	
				for ( var i=0; i<buttons.length; i++ )
				{
					html += '<button id="beditor-button-'+buttons[i].id+'" class="beditor-button">'+buttons[i].label+'</button>';
				}
				html += '<button id="beditor-button-start-editing" class="beditor-button-right">Start editing</button>'; 
				
				html += ' \
					</div> \
					<div class="beditor-spacer"></div> \
					<div id="beditor-input"> \
					</div> \
				</div> \
				<div id="select-type-cell-dlg" title="Request"> \
				  <form id="cell-type-form"> \
				  	 <div style="padding: 10px 0px 5px 0px; color: #888;">Please select what kind of data you want to put in.</div> \
				  	 <br/> \
				    <fieldset> \
						<ul>';
				
				var plugins = this.pluginRegistry.getPluginsInfo ();
				for ( var i=0; i<plugins.length; i++ )
				{
					html += '<li><label for="'+plugins[i].id+'">'+plugins[i].label+'</label>';
					html += '<span></span><input type="radio" name="celltype" value="'+plugins[i].id+'" /><span></span></li>';					
				}
								    
				html +=     '</ul> \
								<input type="hidden" name="cellname" value=""> \
								<input type="submit" tabindex="-1" style="position:absolute; top:-1000px"> \
						    </fieldset> \
						  </form> \
						</div>';
				
				// Append the code and attach events handler
				$( '#'+this.formId ).before( html );
				$( '#'+this.textareaId ).css( 'display', 'none' );
				
				$( '#beditor-button-start-editing' ).on( 'click', function() { BEDITOR.onToggleEditingMode() } );
				for ( var i=0; i<buttons.length; i++ )
					$( '#beditor-button-'+buttons[i].id ).on( 'click', function(event) { BEDITOR.onAddBlock( event ) } );
				
				$( '#beditor-input' ).sortable( { revert: true, axis: 'y', start: function( event, ui ) { $( '#beditor-input' ).addClass( 'noclick' ); } } );		
				$( '#beditor-input' ).on( 'click', function(event) { BEDITOR.onClickEditorBackground( event ) } );
				
				$( '#'+this.formId ).submit( function( event ) { BEDITOR.updateTxtareaOnSubmit(); } );
				
				// Save an "instance" of the dialog for selecting the type of a cell.
				this.selectTypeCellDialog = $( '#select-type-cell-dlg' ).dialog({
					autoOpen: false,
					height:   400,
					width:    350,
					modal:    true,
					buttons: { 'OK': function () { BEDITOR.onSelectCellType(); $( this ).dialog( 'close' ); } },
					close: function () { $( '#cell-type-form' ).trigger( 'reset' ); }
				});	
			},
			
			showSelectTypeCellDialog: function ( cellName )
			{
				$( '#cell-type-form' ).trigger( 'reset' );
				$( 'input[name=cellname]' ).val( cellName );
				this.selectTypeCellDialog.dialog( 'open' );
			},

			
			/**
		 	 * Registry of cells and blocks
			 * 
			 */
		
			eltRegistry: {
				elts:   {},
				length: 0,
				
				getByName: function ( name )       { return this.elts[ name ]; },
				
				addElt: function ( name, data )    { this.elts[ name ] = data; this.length++; },
				
				updateElt: function ( name, data ) { this.elts[ name ] = data; },
				
				delElt: function ( name )          { delete this.elts[ name ]; this.length--; },
				
				getLength: function ()             { return this.length; },
				
				getCellsByBlockName: function ( name )
				{
					var cells = [];
					for (var eltName in this.elts)
						if ( this.elts[eltName].parent == name )
							cells.push ( this.elts[eltName] );
					
					return cells;
				},
				
				getAllCells: function ()
				{
					var cells = [];
					for (var eltName in this.elts)
						if ( this.elts[eltName].parent != 0 )
							cells.push ( this.elts[eltName] );
					
					return cells;					
				},
				
				updateCellData: function ( name, data ) { this.elts[ name ].data = data; },
				updateCellType: function ( name, data ) { this.elts[ name ].type = data; }
			},
			
			
			/**
		 	 * Registry of plugins
			 * 
			 */			
			
			pluginRegistry: {
				plugins: {},
				
				// Register a plugin.
				add: function ( plugin ) { this.plugins[ plugin.id ] = plugin; },
				
				// Call a method of a plugin.		
				callMethod: function ( id, methodName, params )
				{
					if ( this.plugins [ id ].hasOwnProperty ( methodName ) )
						return this.plugins [ id ][ methodName ]( params );
				},
				
				// return the {id,label} of all the plugins in an array
				getPluginsInfo: function ()
				{
					var info = [];
					for (var id in this.plugins)
						info.push ( this.plugins[id] );
					
					return info;							
				}
			},	
			

			/**
		 	 * Registry of buttons (main tool bar)
			 * 
			 */

			buttonRegistry: {
				buttons: {},
				
				// Register a button.
				add: function ( button ) { this.buttons[ button.id ] = button; },
				
				// Call a method of a plugin.		
				callMethod: function ( id, methodName, param ) { return this.buttons [ id ][ methodName ]( param ); },
				
				// return the {id,label} of all the plugins in an array
				getButtonsInfo: function ()
				{
					var info = [];
					for ( var id in this.buttons )
						info.push ( this.buttons[ id ] );
					
					return info;							
				}
			},	
			
			
			/**
			 * Management of blocks
			 *
			 */	
			 
			 // Add a block to the editor input and attach events 
			 addBlock: function ( blockType, cellInfo )
			 {
				var blockContent = ''; 
				var blockNumber  = this.eltRegistry.getLength();
				var blockName    = 'beditor-block-'+blockNumber;
				
				var cellNameSuffix = 'beditor-cell-'+blockNumber;
				var blankCells = this.buttonRegistry.callMethod ( blockType, 'getCells', cellNameSuffix );
				var j=0;
				for ( var cellName in blankCells )
				{
					blockContent += blankCells[ cellName ];
					var cellType = cellInfo != null ? cellInfo[ j ].type : '';
					var cellData = cellInfo != null ? cellInfo[ j ].data : null;
					this.eltRegistry.addElt( cellName, { name: cellName, type: cellType, parent: blockName, data: cellData } );
					j++;
				}
				
				$( '#beditor-input' ).append( $( '<div id="'+blockName+'" class="beditor-block-wrapper">'+blockContent+'</div>' ) );
				this.hideCellMenuBar();				
				this.eltRegistry.addElt( blockName, { name: blockName, type: blockType, parent: 0 } );				

				var cells = this.eltRegistry.getCellsByBlockName ( blockName );
				for ( var i=0; i<cells.length; i++ )
				{
					if ( cells[ i ].type != '' )
						this.pluginRegistry.callMethod( cells[ i ].type, 'onLoad', { name: cells[ i ].name, data: cells[ i ].data } );
					
					$( '#'+cells[i].name ).on( 'click', function( event ) { BEDITOR.onClickCell ( $( this ).attr( 'id' ) ) } );
					
					this.addCellMenu( cells[ i ].name );
					$( '#bm-'+cells[i].name ).on( 'click', function( event )
						{
							var buttonName = $(this).attr( 'id' );
							var cellName = buttonName.split( 'bm-' )[1];  	
							var pX = event.pageX, pY = event.pageY;
							
							BEDITOR.onClickCellButtonMenu ( {name: cellName, X: pX, Y: pY} );
							event.stopPropagation();
						});					
				}			 
			 },
			 
			 // Delete a block in the editor input
			 deleteBlock: function ( blockName )
			 {
				var cells = this.eltRegistry.getCellsByBlockName ( blockName );
				for ( var i=0; i<cells.length; i++ )
				{
					// first, the cells...
					$( '#'+cells[i].name ).off();
					this.deleteCellMenu ( cells[ i ].name );  
					this.eltRegistry.delElt ( cells[ i ].name );							
				}
				
				// ...then, the block.
				this.eltRegistry.delElt ( blockName );
				$( '#'+blockName ).remove();								 	
			 },			 		
			 
			 
			/**
		 	 * Cell menu
			 * 
			 */
			 			 			
			// Add dynamically the code in the webpage and attach events 
			addCellMenu: function ( cellName )
			{
				var html = '<ul id="cm-'+cellName+'" class="cell-context-menu"> \
									<li data-action="copy">Copy</li> \
									<li data-action="past">Past</li> \
									<li data-action="blank">Blank</li> \
									<li data-action="delete-block">Delete block</li> \
								</ul>';	
				$( '#beditor-wrapper' ).after( html );	
				
				$( '#cm-'+cellName+' li' ).on( 'click', function()
				{
					var ulName = $( this ).parent().attr( 'id' );
					var clickedCell = ulName.split( 'cm-' )[1];
					
					switch( $( this ).attr( 'data-action' ) )
					{
						case 'copy' :        BEDITOR.onCopyCell ( clickedCell ); break;
						case 'past' :        BEDITOR.onPastCell ( clickedCell ); break;
						case 'blank' :       BEDITOR.onBlankCell( clickedCell ); break;
						case 'delete-block': var cellObj = BEDITOR.eltRegistry.getByName( clickedCell ); BEDITOR.onDeleteBlock ( cellObj.parent ); break;
					}
					
					BEDITOR.hideCellMenu();
				} );						
			},
			
			hideCellMenu: function ()
			{
        		$( '.cell-context-menu' ).hide();			
        	},
			
			deleteCellMenu: function ( cellName )  
			{
				this.hideCellMenu();
				
				//switch off events and remove the code		
				$( '#cm-'+cellName ).off();
				$( '#bm-'+cellName ).off();  // button
				$( '#cm-'+cellName ).remove();	
			},
			
			hideCellMenuBar: function ()
			{
				$( '.beditor-cell-menu-bar' ).hide();
			},
			
			showCellMenuBar: function ()
			{
				$( '.beditor-cell-menu-bar' ).show();
			},
		
							
			/**
		 	 * Events 
			 * 
			 */
			
			// Event handler called for adding a block to the editor input.
			onAddBlock: function ( event )
			{
				var cmd       = event.target.id;
				var blockType = cmd.split( 'beditor-button-' )[1];
				
				this.addBlock( blockType, null );
			},

			// Event handler called for deleting a block and associated cells.
			onDeleteBlock: function ( blockName )
			{
				if( confirm( 'Do you want to delete this block ?\nAll the data will be lost.' ) )
					this.deleteBlock ( blockName );
			},
			
			
			// Event handler called when the user click on a cell	
			onClickCell: function ( cellName )
			{
				// Avoid the click event after a drag.
				if ( $( '#beditor-input'  ).hasClass( 'noclick' ) )
				{
        			$( '#beditor-input' ).removeClass( 'noclick' );
        			return;
        		}
        		
        		// If context menu is shown, hide it
				this.hideCellMenu();	
							
				if ( this.isEditingModeEnabled )
				{
				   // If cell.type = '', ask for the type.
					var cellClicked = this.eltRegistry.getByName( cellName );
					if( cellClicked.type == '' )
					{
						this.showSelectTypeCellDialog( cellName );
						return;				
					}		
					
					// Call the plugin method 'onClick'.
					this.pluginRegistry.callMethod( cellClicked.type, 'onClick', { name: cellName, data: cellClicked.data } );	
				}
			},

			// Event handler called when the user selected the type of cell. 
			onSelectCellType: function ()
			{
				this.selectTypeCellDialog.find( 'form' ).on( 'submit', function ( event ) { event.preventDefault(); } );
				var cellType = $( 'input[name=celltype]:checked' ).val();
				var cellName = $( 'input[name=cellname]').val();
				
				var cellObj = this.eltRegistry.getByName ( cellName ); 
				cellObj.type = cellType;
				this.eltRegistry.updateElt ( cellName, cellObj );	
			},	
			
			// Copy the data of the cell to the buffer "copypast"
			onCopyCell: function ( cellName )
			{
				var cellObj = this.eltRegistry.getByName( cellName );
				if ( cellObj.type == '' )
				{
					alert( 'Nothing to copy! :(' );
					return;
				}
				
				var data = this.pluginRegistry.callMethod( cellObj.type, 'onCopy', { name: cellName, data: null } );
				this.copypast = { type: cellObj.type, data: data };
			},
			
			// Past the data from the buffer to the cell
			onPastCell: function ( cellName )
			{
				if ( this.copypast != null )
				{
					var cellObjBefore = this.eltRegistry.getByName ( cellName );
					if ( cellObjBefore.type != '' )
						this.pluginRegistry.callMethod( cellObjBefore.type, 'onEditingModeEnd', { name: cellName, data: cellObjBefore.data } );
					
					this.eltRegistry.updateCellType( cellName, this.copypast.type );
					this.eltRegistry.updateCellData( cellName, this.copypast.data );
					this.pluginRegistry.callMethod( this.copypast.type, 'onPast', { name: cellName, data: this.copypast.data } );
					this.pluginRegistry.callMethod( this.copypast.type, 'onEditingModeBegin', { name: cellName, data: this.copypast.data } );
				}
				else
					alert ( 'Nothing to past! :(' );
			},	

			// Reset a cell
			onBlankCell: function ( cellName )
			{
				var cellObj = this.eltRegistry.getByName ( cellName ); 
				this.pluginRegistry.callMethod( cellObj.type , 'onEditingModeEnd', { name: cellName, data: null } );
				
				this.eltRegistry.updateCellType( cellName, '' );
				this.eltRegistry.updateCellData( cellName, null );
				
				$( '#'+cellName ).html( '' ); 
			},
			
			// Event handler called when the user click on the menu button of a cell
			onClickCellButtonMenu: function ( cellInfo )
			{
				if ( this.isEditingModeEnabled )
				{
					this.hideCellMenu();
					
					if( this.CellMenuShown.name == cellInfo.name )
						this.CellMenuShown.name = '';
					else
					{					
						$( '#cm-'+cellInfo.name ).finish().toggle(100).css( { top: cellInfo.Y + 'px', left: cellInfo.X + 'px' } );	
						this.CellMenuShown.name = cellInfo.name; 
					}
				}
			},
					
			// Hide a context menu if the user click in the editor background.
			onClickEditorBackground:  function ( event ) { this.hideCellMenu(); }, 
			
			// Switch between "editing mode" and "sorting mode"
			onToggleEditingMode: function ()
			{	
				var methodName = '';
				this.hideCellMenu();
				
				var cells = this.eltRegistry.getAllCells();
								
				if ( this.isEditingModeEnabled )
				{					
					this.isEditingModeEnabled = false;
					$( '#beditor-button-start-editing' ).html( 'Start editing' );
					
					// Enable sorting of blocks
					if ( !$( '#beditor-input' ).hasClass( 'ui-sortable' ) )
						$( '#beditor-input' ).sortable( { revert: true, axis: 'y', start: function( event, ui ) { $( '#beditor-input' ).addClass( 'noclick' ); } } );
					
					this.hideCellMenuBar();
					
					//Show the main buttons in the editor menu
					$( "button[class='beditor-button']" ).show();
					$( "input[type='submit'], button[type='submit']" ).show();
					
					// Save the data of each cell before closing the editing mode
					for( var i=0; i<cells.length; i++ )
						if ( cells[ i ].parent != 0 && cells[ i ].type != '' )
						{
							var data = this.pluginRegistry.callMethod( cells[i].type, 'onCopy', cells[i] );
							this.copypaste = { type: cells[i].type, data: data };
							cells[i].data = data; // update the local copy too for further processing 
						}
					
					methodName = 'onEditingModeEnd';
				}
				else
				{		
					// if no block in the editor, stop.
					if ( this.eltRegistry.getLength() == 0 )
						return;
									
					this.isEditingModeEnabled = true;
					$( '#beditor-button-start-editing' ).html( 'Finish editing' );
					
					// Disable sorting of blocks
					if ( $( '#beditor-input' ).hasClass( 'ui-sortable' ) )
						$( '#beditor-input' ).sortable( 'destroy' );	

					this.showCellMenuBar();
					
					//Hide the main buttons in the editor menu
					$( "button[class='beditor-button']" ).hide();
					$( "input[type='submit'], button[type='submit']" ).hide();
					
					methodName = 'onEditingModeBegin';
				}	

				// Call the right plugin depending on the cell type.
				for( var i=0; i<cells.length; i++ )
					if ( cells[i].parent != 0 && cells[i].type != '' )
						this.pluginRegistry.callMethod( cells[i].type, methodName, cells[i] );			
			},
		
		
			/**
		 	 *  Import from/Export to JSON 
			 * 
			 */

			// Blocks to JSON
			// Structure: [ { type: 'block1', data:[ {type: 'text', data: '<p>hello</p>'} ; ... ] } ; {...} ; ...]
			translateBlockstoJSON: function ()
			{
				var editorContent = [];
				var sortedBlocks = $( '#beditor-input' ).sortable( 'toArray' );
					 
				for( var i=0; i < sortedBlocks.length; i++ )
				{
					var block = this.eltRegistry.getByName( sortedBlocks[ i ] );
					var cells = this.eltRegistry.getCellsByBlockName( sortedBlocks[ i ] );
					
					var cellsArr = [];
					for( var j=0; j<cells.length; j++ )
						cellsArr.push ( {type: cells[ j ].type, data: cells[ j ].data} );
						
					editorContent.push ( {type: block.type, data: cellsArr} );
				}

				return JSON.stringify( editorContent ); 
			},
		
			// JSON to Blocks
			translateJSONtoBlocks: function ()
			{
				var edContentJSON = $( '#'+this.textareaId ).val().trim();
				if ( edContentJSON != '' )
				{
					var edContentObj;						
					try { edContentObj = JSON.parse( edContentJSON ); }
					catch (e) { alert( "Parsing error.\nCan't convert input data to blocks. :(" ); return; }
					
					for( var i=0; i<edContentObj.length; i++ )
					{				
						var blockType = edContentObj[ i ].type;
						this.addBlock ( blockType, edContentObj[ i ].data);
					}
				}
			},

			// Event handler called for replacing the content of the textarea by JSON data on submit. 
			updateTxtareaOnSubmit: function ()
			{
				var document = this.translateBlockstoJSON();
				$( '#'+this.textareaId ).val( document );						
			}
		};
		
		return BEDITOR;
	})();
}



/***********************************\
| Buttons and plugins registration. | 
\***********************************/


/*
 * Buttons registration 
 */
	 
BEDITOR.buttonRegistry.add (
{
	id:    '1col',
	label: '1 col',
	
	getCells: function ( cellName )
	{			
		var cells = {};
		cells [ cellName+'_a' ] = '<div class="beditor-cell-11"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_a" type="button" value=" > " /></div><div id="'+cellName+'_a" class="beditor-cell-content"></div></div>';
		
		return cells;
	}
} );

BEDITOR.buttonRegistry.add (
{
	id:    '2col',
	label: '2 col',
	
	getCells: function ( cellName )
	{			
		var cells = {};
		cells [ cellName+'_a' ] = '<div class="beditor-cell-12"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_a" type="button" value=" > " /></div><div id="'+cellName+'_a" class="beditor-cell-content"></div></div>';
		cells [ cellName+'_b' ] = '<div class="beditor-cell-12"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_b" type="button" value=" > " /></div><div id="'+cellName+'_b" class="beditor-cell-content"></div></div>';
		
		return cells;
	}
} );

BEDITOR.buttonRegistry.add (
{
	id:    '3col',
	label: '3 col',
	
	getCells: function ( cellName )
	{			
		var cells = {};
		cells [ cellName+'_a' ] = '<div class="beditor-cell-13"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_a" type="button" value=" > " /></div><div id="'+cellName+'_a" class="beditor-cell-content"></div></div>';
		cells [ cellName+'_b' ] = '<div class="beditor-cell-13"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_b" type="button" value=" > " /></div><div id="'+cellName+'_b" class="beditor-cell-content"></div></div>';
		cells [ cellName+'_c' ] = '<div class="beditor-cell-13"><div class="beditor-cell-menu-bar"><input id="bm-'+cellName+'_c" type="button" value=" > " /></div><div id="'+cellName+'_c" class="beditor-cell-content"></div></div>';
		
		return cells;
	}
} );



/*
 * Plugins registration 
 */
 
BEDITOR.pluginRegistry.add (
{
	id:    'text',
	label: 'Text',
	
	onLoad: function ( cellInfo )
	{
		if( cellInfo.data == null )
			cellInfo.data = '';
			
		$( '#'+cellInfo.name ).html( cellInfo.data );	
	},
		
	onClick: function ( cellInfo )
	{
		// Enable editing
		$( '#'+cellInfo.name ).attr( 'contenteditable', true );
		if ( !CKEDITOR.instances[ cellInfo.name ] )
		{
			CKEDITOR.inline( cellInfo.name, {
				extraAllowedContent: 'code',
				removePlugins: 'stylescombo',
				extraPlugins: 'sourcedialog',
				startupFocus: false
			});
		}
	},
	
	onCopy: function ( cellInfo )
	{
		return $( '#'+cellInfo.name ).html();
	},
	
	onPast: function ( cellInfo )
	{
		if( cellInfo.data == null )
			cellInfo.data = '';
			
		$( '#'+cellInfo.name ).html( cellInfo.data );
	},
			
	onEditingModeEnd: function ( cellInfo )
	{	
		// Disable editing 
		$( '#'+cellInfo.name ).removeAttr( 'contenteditable' );
		
		if ( CKEDITOR.instances[ cellInfo.name ] )
			CKEDITOR.instances[ cellInfo.name ].destroy();		
	},
	
} );	

BEDITOR.pluginRegistry.add ( {
	id:    'youtube',
	label: 'YouTube',
	
	videoIDs: [],

	onLoad: function ( cellInfo )
	{		
		$( '#'+cellInfo.name ).html ( this.get_static_video_container( cellInfo ) );
	},
	
	onEditingModeBegin: function ( cellInfo )
	{		
		$( '#'+cellInfo.name ).html ( this.get_static_video_container( cellInfo ) );
	},
	
	onClick: function ( cellInfo )
	{	
		cellInfo.data = prompt( 'Please enter your video ID', '');	
		if ( cellInfo.data != null )
			$( '#'+cellInfo.name ).html ( this.get_static_video_container( cellInfo ) );
	},
	
	onCopy: function ( cellInfo )
	{
		return this.videoIDs[ cellInfo.name ];
	},
	
	onEditingModeEnd: function ( cellInfo )
	{
		cellInfo.data = this.videoIDs[ cellInfo.name ];
			
		$( '#'+cellInfo.name ).html ( this.get_video_container( cellInfo ) );
	},
	
	// private methods
	get_static_video_container: function ( cellInfo )
	{
		var html = '';
		
		if ( cellInfo.data != null )
		{
			this.videoIDs[ cellInfo.name ] = cellInfo.data;
			html = '<div class="video-container-static" style="background-image:url(\'https://i1.ytimg.com/vi/'+cellInfo.data+'/sddefault.jpg\');"><img src="block-editor/youtube_logo.png" style="width: 100px; background-color: white; opacity: 0.8;"></div>';			
		}	
		
		return html;				
	},
	
	get_video_container: function ( cellInfo )
	{
		var html = '';
		
		if ( cellInfo.data != null )
			html = '<div class="video-container"><iframe width="560" height="315"  src="https://www.youtube.com/embed/'+cellInfo.data+'" frameborder="0" allowfullscreen></iframe></div>';
		
		return html;
	}	
} );	

BEDITOR.pluginRegistry.add ( {
	id:    'staticimage',
	label: 'Static Image',
	
	imgURLs: [],

	onLoad: function ( cellInfo )
	{		
		$( '#'+cellInfo.name ).html ( this.get_image_container( cellInfo ) );	
	},
	
	onEditingModeBegin: function ( cellInfo )
	{
		$( '#'+cellInfo.name ).html ( this.get_image_container( cellInfo ) );		
	},
	
	onClick: function ( cellInfo )
	{	
		cellInfo.data = prompt( 'Please enter the URL of the image.', '');	
		if ( cellInfo.data != null )
			$( '#'+cellInfo.name ).html ( this.get_image_container( cellInfo ) );
	},
	
	onCopy: function ( cellInfo )
	{
		return this.imgURLs[ cellInfo.name ];
	},
	
	// private method
	get_image_container: function ( cellInfo )
	{
		var html = '';
		
		if ( cellInfo.data != null )
		{
			this.imgURLs[ cellInfo.name ] = cellInfo.data;
			html = '<div class="static-image-container" style="background-image: url('+cellInfo.data+');"><img src="'+cellInfo.data+'" style="visibility: hidden; width: inherit;" /></div>';
		}
		
		return html;
	}
} );	


/********************\
| Webpage ready ! =D | 
\********************/

$( function ()
{
	BEDITOR.insertEditor();
	BEDITOR.translateJSONtoBlocks();
})
