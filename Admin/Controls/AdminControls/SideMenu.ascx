<%@ Control Language="C#" AutoEventWireup="true" CodeFile="SideMenu.ascx.cs" Inherits="Admin_Controls_AdminControls_SideMenu" %>
<!-- BEGIN: Side Menu -->
<script type="text/javascript">
    function changeClass(id) {
        document.getElementById(id).classList.add("side-menu--active");
    }
    function changeClassOpen(id) {
        document.getElementById(id).classList.add("side-menu__sub-open");
    }
</script>
<nav class="side-nav">
    <a href="" class="intro-x flex items-center pl-5 pt-4">
        <img alt="Midone Tailwind HTML Admin Template" class="w-6 logoWidth" src="../../Admin/images/hnm-logo.png" >
    </a>
    <div class="side-nav__devider my-6"></div>
    <ul>
        <asp:PlaceHolder ID="litMainMenu" runat="server"></asp:PlaceHolder>
    </ul>
</nav>
<!-- END: Side Menu -->
