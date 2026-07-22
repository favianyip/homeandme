<%@ Control Language="C#" AutoEventWireup="true" CodeFile="SideMenuMobile.ascx.cs" Inherits="Admin_Controls_AdminControls_SideMenuMobile" %>
<div class="mobile-menu md:hidden">
    <div class="mobile-menu-bar">
        <a href="" class="flex mr-auto">
            <img alt="Midone Tailwind HTML Admin Template" class="w-6 logoWidth" src="../../Admin/images/hnm-logo.png" >
        </a>
        <a href="javascript:;" id="mobile-menu-toggler"><i data-feather="bar-chart-2" class="w-8 h-8 text-white transform -rotate-90"></i></a>
    </div>
    <ul class="border-t border-theme-24 py-5 hidden">
        <asp:Literal ID="litMobileMenu" runat="server"></asp:Literal>
    </ul>
</div>
