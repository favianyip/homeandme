<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ChangePassword.aspx.cs" Inherits="Admin_ChangePassword" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <asp:UpdatePanel runat="server" UpdateMode="Always">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <i data-feather="chevron-right" class="breadcrumb__icon"></i>
                    <a href="#" class="breadcrumb--active">Change Password</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Upadate Your Password
                            </h2>
                        </div>
                        <div class="p-5" id="vertical-form">
                            <div class="preview">
                                <div>
                                    <label>Current Password*:</label>
                                    <asp:TextBox ID="txtCurrentPassword" runat="server" CssClass="input w-full border mt-2" MaxLength="50" TextMode="Password" />
                                    <asp:RequiredFieldValidator ID="rfv" runat="server" ControlToValidate="txtCurrentPassword" ErrorMessage="Please enter your current password."
                                        ValidationGroup="user" Display="Dynamic" ForeColor="Red" />
                                </div>
                                <div class="mt-3">
                                    <label>New Password*:</label>
                                    <asp:TextBox ID="txtNewPasword" runat="server" CssClass="input w-full border mt-2" MaxLength="50" TextMode="Password" />
                                    <asp:RequiredFieldValidator ID="rfvNewPassword" runat="server" ControlToValidate="txtNewPasword" ErrorMessage="Please enter your new password."
                                        ValidationGroup="user" Display="Dynamic" ForeColor="Red" />
                                </div>
                                <div class="mt-3">
                                    <label>Confirm Password*:</label>
                                    <asp:TextBox ID="txtConfirm" runat="server" CssClass="input w-full border mt-2" MaxLength="50" TextMode="Password" />
                                    <asp:RequiredFieldValidator ID="rfvConfirm" runat="server" ControlToValidate="txtConfirm" ErrorMessage="Please enter confirm password."
                                        ValidationGroup="user" Display="Dynamic" ForeColor="Red" />
                                    <asp:CompareValidator ID="cvPaasword" runat="server" ControlToValidate="txtConfirm" ControlToCompare="txtNewPasword" ErrorMessage="Password mismatch."
                                        ValidationGroup="user" Display="Dynamic" ForeColor="Red" />
                                </div>
                                <asp:Button ID="btnChangePassword" runat="server" CssClass="button bg-theme-1 text-white mt-5" OnClick="btnChangePassword_Click" Text="Update Password" ValidationGroup="user" CausesValidation="true" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" />
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

