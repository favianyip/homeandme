<%@ Control Language="C#" AutoEventWireup="true" CodeFile="SideMenu.ascx.cs" Inherits="Controls_Usercontrols_SideMenu" %>
<div class="hnm-sidebar">
    <div class="hnm-sidebar__project" id="divProjects" runat="server" visible="false">
        <asp:DropDownList runat="server" ID="ddlProjects" OnSelectedIndexChanged="ddlProjects_SelectedIndexChanged" AutoPostBack="true" CssClass="hnm-sidebar__project-select">
        </asp:DropDownList>
    </div>
    <div class="hnm-sidebar__menu">
        <a class="hnm-sidebar__menu-select" href="javascript:void(0);">My Profile</a>
        <div class="hnm-sidebar__link-area">
            <a href="/MyProfile.aspx" class="hnm-sidebar__link active" id="anMyprofile" runat="server">My Profile</a>
            <a href="/AddressInformation.aspx" class="hnm-sidebar__link" id="anAddressInfo" runat="server">Address Information</a>
            <a href="/ProjectDetails.aspx" class="hnm-sidebar__link" id="anProjectDetails" runat="server">Project Details</a>
            <a href="/PropertyDetails.aspx" class="hnm-sidebar__link" id="anPropertyDetails" runat="server">Property Details</a>
            <a href="/PartnerInformation.aspx" class="hnm-sidebar__link" id="anPartnerInfo" runat="server">Partner Information</a>
            <a href="/PaymentDetails.aspx" class="hnm-sidebar__link" id="anPayment" runat="server">Payment</a>
        </div>
    </div>
</div>
