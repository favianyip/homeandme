<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="PaymentQRCodeScan.aspx.cs" Inherits="PaymentQRCodeScan" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <style>
        .QRcenter {
            display: block;
            margin-left: auto;
            margin-right: auto;
        }

        .topTextCenter  {
            padding-bottom: 25px;
            padding-top: 25px;
            text-align: center;
            font-size: 18px;
        }
        .QRImageborder{
            border : 1px solid black;
        }
    </style>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <div class="hnm-about-new">
        <div class="content-wrapper">
            <div class="topTextCenter">
                Scan this QR Code to Pay the Amount.
            </div>
            <div>
                <img src="assets/images/PaymentQRCode.jpg" width="500" height="500" class="QRcenter QRImageborder" />
            </div>
        </div>
    </div>
</asp:Content>

