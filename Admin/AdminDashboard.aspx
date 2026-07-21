<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="AdminDashboard.aspx.cs" Inherits="Admin_AdminDashboard" %>

<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <div class="top-bar">
        <div class="-intro-x breadcrumb mr-auto hidden sm:flex">
            <a href="AdminDashboard.aspx" class="">Home</a>
        </div>
        <div class="intro-x relative mr-3 sm:mr-6">
            <div class="search hidden sm:block">
            </div>
        </div>
        <dx:accountmenu runat="server" id="AccountMenu" />
    </div>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 xxl:col-span-12 grid grid-cols-12 gap-6">
            <div class="col-span-12 mt-8">
                <div class="intro-y flex items-center h-10">
                    <h2 class="text-lg font-medium truncate mr-5">General Report
                                </h2>
                </div>
                <div class="grid grid-cols-12 gap-6 mt-5">
                </div>
            </div>
        </div>
    </div>
</asp:Content>

