<?
//**********************************************************************************************
//                                      template.php
//
// Author(s): lmout82
// BEDITOR version 1.0 beta
// Licence:  MIT License
// Link: https://github.com/lmout82/yoBEditor.git
// Creation date: August 2016
// Last modification date: October 2016
//***********************************************************************************************

// !This is a "quick and dirty" script to show you how to process JSON data.
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">

<head>
  <title>ARaynorDesign Template</title>
  <meta name="description" content="free website template" />
  <meta name="keywords" content="enter your keywords here" />
  <meta http-equiv="content-type" content="text/html; charset=utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=9" />
  <link rel="stylesheet" type="text/css" href="template/css/style.css" />
</head>

<body>
  <div id="main">
    <div id="header">
	  <div id="banner">
	    <div id="welcome">
	      <h1>Welcome To Grey Ropes</h1>
	    </div><!--close welcome-->
	    <div id="menubar">
          <ul id="menu">
            <li class="current"><a href="index.html">Home</a></li>
            <li><a href="#">Our Work</a></li>
            <li><a href="#">Testimonials</a></li>
            <li><a href="#">Projects</a></li>
            <li><a href="#">Contact Us</a></li>
          </ul>
        </div><!--close menubar-->	  
	  </div><!--close banner-->	
    </div><!--close header-->	
    
	<div id="site_content">		
<?php
$postdata = file_get_contents("php://input");
$postdata = explode("=", $postdata);
$jsondata = json_decode ( urldecode($postdata[1]) );

$html = '';
foreach ($jsondata as $block)
{	
	switch ($block->type)
	{
		case '1col':
			$cell  = $block->data[0];
			$html .= '<div id="content"><div class="content_item">';
			$html .= get_cell($cell->type, $cell->data);
			$html .= '</div></div>';		
		break;
		
		case '2col':
			$html .='<div id="content"><div class="content_item">';
			foreach ($block->data as $cell)
				$html .= '<div class="content_container">'.get_cell($cell->type, $cell->data).'</div>';
          		
			$html .= '</div></div>'; 		
		break;
		
		case '3col':
			foreach ($block->data as $cell)
				$html .= '<div class="col3_blue_cell">'.get_cell($cell->type, $cell->data).'</div>';
				
		break;	
	}
}

echo $html;

function get_cell($type, $data)
{
	$cell_html = '';
	switch ($type)
	{
		case 'text';
			$cell_html = $data;
		break;

		case 'staticimage';
			$cell_html = '<img src="'.$data.'" />';
		break;

		case 'youtube';
			$cell_html = '<div class="video-container"><iframe width="560" height="315"  src="https://www.youtube.com/embed/'.$data.'" frameborder="0" allowfullscreen></iframe></div>';;	
		break;		
	}
	
	return $cell_html;
}
?>
	</div><!--close site_content--> 
    
	<div id="content_grey">
	  <div class="content_grey_container_box">
		<h4>Latest Blog Post</h4>
	    <p> Phasellus laoreet feugiat risus. Ut tincidunt, ante vel fermentum iaculis.</p>
		<div class="readmore">
		  <a href="#">Read more</a>
		</div><!--close readmore-->
	  </div><!--close content_grey_container_box-->
      <div class="content_grey_container_box">
       <h4>Latest News</h4>
	    <p> Phasellus laoreet feugiat risus. Ut tincidunt, ante vel fermentum iaculis.</p>
	    <div class="readmore">
		  <a href="#">Read more</a>
		</div><!--close readmore-->
	  </div><!--close content_grey_container_box-->
      <div class="content_grey_container_boxl">
		<h4>Contact Us</h4>
	    <p> Phasellus laoreet feugiat risus. Ut tincidunt, ante vel fermentum iaculis.</p>
	    <div class="readmore">
		  <a href="#">Read more</a>
		</div><!--close readmore-->	  
	  </div><!--close content_grey_container_box1-->      
	  <br style="clear:both"/>
    </div><!--close content_grey-->   
 
  </div><!--close main-->
  
  <div id="footer_container">
    <div id="footer">
	  <a href="http://validator.w3.org/check?uri=referer">Valid XHTML</a> | <a href="http://fotogrph.com/">Images</a> | with thanks to <a href="http://www.e-shot.net/ugc/free-email-templates-are-bad-idea-for-reputable-businesses/">e-shot</a> | website template by <a href="http://www.araynordesign.co.uk">ARaynorDesign</a>
    </div><!--close footer-->  
  </div><!--close footer_container-->  
  
</body>
</html>
