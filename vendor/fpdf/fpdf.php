<?php
/*
FPDF stub loader: In a real setup you would install FPDF via composer or copy full library.
For brevity, this is a tiny shim that errors out if missing. Replace with full FPDF if needed.
*/
if (!class_exists('FPDF')) {
  class FPDF {
    public function __construct($o='P',$u='mm',$s='A4'){}
    public function AddPage(){}
    public function SetFont($f,$style='',$size=12){}
    public function Cell($w,$h=0,$txt='',$border=0,$ln=0,$align='',$fill=false,$link=''){}
    public function Ln($h=null){}
    public function Output($dest='I',$name='doc.pdf',$utf8=false){ header('Content-Type: application/pdf'); echo "%PDF-1.3\n% Minimal stub PDF\n"; }
  }
}