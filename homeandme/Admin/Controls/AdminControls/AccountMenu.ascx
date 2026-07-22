<%@ Control Language="C#" AutoEventWireup="true" CodeFile="AccountMenu.ascx.cs" Inherits="Admin_Controls_Admincontrols_AccountMenu" %>
<div class="intro-x relative mr-3 sm:mr-6" id="divWebShopbtn" runat="server" visible="false"></div>
<div class="intro-x dropdown w-8 h-8 relative">
    <div class="dropdown-toggle w-8 h-8 rounded-full overflow-hidden shadow-lg image-fit zoom-in">
        <img alt="Midone Tailwind HTML Admin Template" src="../../Admin/images/profile-8.jpg">
    </div>
    <div class="dropdown-box mt-10 absolute w-56 top-0 profileArea z-20">
        <div class="dropdown-box__content box bg-theme-38 text-white">
            <div class="p-4 border-b border-theme-40">
                <div class="font-medium">
                    <asp:Label ID="lblName" runat="server" Text="Label"></asp:Label>
                </div>
                <div class="text-xs text-theme-41">
                    <asp:Label ID="lblRole" runat="server" Text="Label"></asp:Label>
                </div>
            </div>
            <div class="p-2">
                <asp:LinkButton ID="lnkMyProfile" runat="server" CssClass="flex items-center block p-2 transition duration-300 ease-in-out hover:bg-theme-1 rounded-md" OnClick="lnkMyProfile_Click"><i data-feather="user" class="w-4 h-4 mr-2"></i>Profile </asp:LinkButton>
                <asp:LinkButton ID="lnkResetPassword" runat="server" CssClass="flex items-center block p-2 transition duration-300 ease-in-out hover:bg-theme-1 rounded-md" OnClick="lnkResetPassword_Click"><i data-feather="lock" class="w-4 h-4 mr-2"></i>Reset Password </asp:LinkButton>
            </div>
            <div class="p-2 border-t border-theme-40">
                <a href="/logout.aspx" class="flex items-center block p-2 transition duration-300 ease-in-out hover:bg-theme-1 rounded-md"><i data-feather="toggle-right" class="w-4 h-4 mr-2"></i>Logout </a>
            </div>
        </div>
    </div>
</div>
