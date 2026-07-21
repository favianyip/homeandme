<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="MyProfile.aspx.cs" Inherits="Admin_MyProfile" %>

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
                    <a href="#" class="breadcrumb--active">My Profile</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:accountmenu runat="server" id="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Update My Admin Profile
                            </h2>
                        </div>
                        <div class="p-5" id="vertical-form">
                            <div class="preview">
                                <div class="mt-3">
                                    <label>Email*:</label>
                                    <asp:TextBox ID="txtEmail" runat="server" CssClass="input w-full border mt-2" MaxLength="200" />
                                    <asp:RequiredFieldValidator ID="RequiredFieldValidator1" runat="server" ControlToValidate="txtEmail"
                                        ErrorMessage="Plese enter your email address." ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                    <asp:RegularExpressionValidator ID="revMail" runat="server"
                                        ErrorMessage="Invalid Email" ControlToValidate="txtEmail"
                                        SetFocusOnError="True" Display="Dynamic"
                                        ValidationExpression="\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*" ForeColor="red">
                                    </asp:RegularExpressionValidator>
                                </div>
                                <div class="mt-3">
                                    <label>Name*:</label>
                                    <asp:TextBox ID="txtName" runat="server" CssClass="input w-full border mt-2" MaxLength="50" />
                                    <asp:RequiredFieldValidator ID="RequiredFieldValidator2" runat="server" ControlToValidate="txtName" ErrorMessage="Please enter your name."
                                        ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                </div>
                                <div class="mt-3">
                                    <label>Address*</label>
                                    <asp:TextBox ID="txtAddress" runat="server" CssClass="input w-full border mt-2" MaxLength="1000" TextMode="MultiLine" />
                                    <asp:RequiredFieldValidator ID="rfvAddress" runat="server" ControlToValidate="txtAddress"
                                        ErrorMessage="Please enter your address." ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                </div>
                                <div class="mt-3">
                                    <label>Moblie*:</label>
                                    <asp:TextBox ID="txtMobile" runat="server" CssClass="input w-full border mt-2" MaxLength="200" />
                                    <asp:RequiredFieldValidator ID="rfvMobile" runat="server" ControlToValidate="txtMobile"
                                        ErrorMessage="Please enter your mobile number." ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                </div>
                                <div class="mt-3">
                                    <label>Phone*:</label>
                                    <asp:TextBox ID="txtPhone" runat="server" CssClass="input w-full border mt-2" MaxLength="200" />
                                    <asp:RequiredFieldValidator ID="rfvPhoneEdit" runat="server" ControlToValidate="txtPhone"
                                        ErrorMessage="Please enter your phone number." ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                </div>
                                <div class="mt-3">
                                    <label>PostCode*:</label>
                                    <asp:TextBox ID="txtPostCode" runat="server" CssClass="input w-full border mt-2" MaxLength="200" />
                                    <asp:RequiredFieldValidator ID="rfvPostCode" runat="server" ControlToValidate="txtPostCode"
                                        ErrorMessage="Please enter your postcode." ValidationGroup="user" Display="Dynamic" ForeColor="red" />
                                </div>
                                <asp:Button ID="btnSave" runat="server" CssClass="button bg-theme-1 text-white mt-5" OnClick="btnSave_Click" Text="Save Changes" ValidationGroup="user" CausesValidation="true" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <uc1:errordisplay runat="server" id="ErrorDisplay" />
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

