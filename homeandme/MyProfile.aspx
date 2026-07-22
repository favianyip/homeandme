<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="MyProfile.aspx.cs" Inherits="MyProfile" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <h3 class="hnm-sub-head">My Profile</h3>
            <div class="hnm-box-head hnm-dashboard__ac-info">
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Account Information</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-dashboard__ac-info-cnt">
                            <div class="hnm-dashboard__ac-info-title">Account Profile</div>
                            <p class="hnm-my-project__addrs">
                                <asp:Label ID="lblName" runat="server"></asp:Label>
                            </p>
                            <p class="hnm-my-project__addrs">
                                <asp:Label ID="lblEmail" runat="server"></asp:Label>
                            </p>
                            <asp:LinkButton ID="lnkChangePassword" runat="server" CssClass="hnm-dashboard__passwrd-chng" OnClick="lnkChangePassword_Click">
                                Change Password</asp:LinkButton>
                        </div>
                        <div class="hnm-dashboard__ac-info-btn">
                            <asp:LinkButton ID="lnkEditAccount" runat="server" CssClass="hnm-button" OnClick="lnkEditAccount_Click">Edit</asp:LinkButton>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hnm-box-head hnm-dashboard__ac-info" id="DivPassword" runat="server" visible="false">
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Change Password</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-dashboard__ac-info-cnt">
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Email*</p>
                                <asp:TextBox ID="txtEmail" Enabled="false" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqemail" runat="server" ControlToValidate="txtEmail" ValidationGroup="Pswd"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter email address" />
                                <asp:RegularExpressionValidator ID="revemail" runat="server" ControlToValidate="txtEmail" ValidationGroup="Pswd"
                                    class="hnm-input__error" ValidationExpression="^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$"
                                    Display="Dynamic" ErrorMessage="Please enter a valid email address" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Current password*</p>
                                <asp:TextBox ID="txtCurrentPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqCurrentPswd" runat="server" ControlToValidate="txtCurrentPassword" ValidationGroup="Pswd"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter current password" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">New Password*</p>
                                <asp:TextBox ID="txtNewPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqNewPaswd" runat="server" ControlToValidate="txtNewPassword" ValidationGroup="Pswd"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter new password" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Password Confirmation*</p>
                                <asp:TextBox ID="txtConfirmPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqConfirmPswd" runat="server" ControlToValidate="txtConfirmPassword" ValidationGroup="Pswd"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter confirm password" />
                                <asp:CompareValidator ID="cmpConfirmPswd" runat="server" ControlToValidate="txtConfirmPassword" ValidationGroup="Pswd"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Password should be same" ControlToCompare="txtNewPassword"></asp:CompareValidator>
                            </div>
                            <div class="hnm-input">
                                <asp:Label ID="lblMsg" runat="server" Visible="false" CssClass="hnm-input__error"></asp:Label>
                            </div>
                        </div>
                        <div class="hnm-dashboard__ac-info-btn">
                            <asp:LinkButton ID="btnUpdatePassword" runat="server" CssClass="hnm-button" OnClick="btnUpdatePassword_Click"
                                CausesValidation="true" ValidationGroup="Pswd">save changes</asp:LinkButton>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hnm-box-head hnm-dashboard__ac-info" id="DivAccountInfo" runat="server" visible="false">
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Account Profile</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-dashboard__ac-info-cnt">
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">First Name*</p>
                                <asp:TextBox ID="txtFirstName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqFirstName" runat="server" ControlToValidate="txtFirstName" ValidationGroup="Account"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter first name" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Last Name*</p>
                                <asp:TextBox ID="txtLastName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqLastName" runat="server" ControlToValidate="txtLastName" ValidationGroup="Account"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter last name" />
                            </div>
                        </div>
                        <div class="hnm-dashboard__ac-info-btn">
                            <asp:LinkButton ID="btnSubmit" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="btnSubmit_Click"
                                CausesValidation="true" ValidationGroup="Account">SUBMIT</asp:LinkButton>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

