<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="Login.aspx.cs" Inherits="Login" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <div class="hnm-breadcrumb">
                <div class="content-wrapper">
                    <div class="hnm-breadcrumb__wrapper">
                        <a href="Home.aspx" title="HOME" class="hnm-breadcrumb__item">HOME</a>
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">Login</a>
                    </div>
                </div>
            </div>
            <div class="hnm-login" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">LOGIN OR SIGN UP TO SAVE YOUR PROJECT</h1>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Email address*</p>
                                <asp:TextBox ID="txtEmailAddress" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqemail" runat="server" ControlToValidate="txtEmailAddress" ValidationGroup="Login"
                                    class="error" Display="Dynamic" ErrorMessage="Enter email address" ForeColor="Red" />
                                <asp:RegularExpressionValidator ID="revemail" runat="server" ControlToValidate="txtEmailAddress" ValidationGroup="Login"
                                    class="hnm-input__error" ValidationExpression="^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$"
                                    Display="Dynamic" ErrorMessage="Please enter a valid email address" ForeColor="Red" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Password*</p>
                                <asp:TextBox ID="txtPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqPassword" runat="server" ControlToValidate="txtPassword" ValidationGroup="Login"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter password" ForeColor="Red" />
                                <asp:Label ID="lblMsg" runat="server" CssClass="hnm-input__error"></asp:Label>
                            </div>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <a href="ForgotPassword.aspx" class="hnm-login__link">Forgot password?</a>
                                    <div class="hnm-login__btn-wrapper">
                                        <asp:LinkButton ID="lnkLogin" runat="server" CssClass="hnm-button" CausesValidation="true" ValidationGroup="Login" OnClick="lnkLogin_Click">Login</asp:LinkButton>
                                        <asp:LinkButton ID="lnkFacebookLogin" runat="server" CssClass="hnm-button" OnClick="lnkFacebookLogin_Click">
                                            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="hnm-button__icon">
                                                <path d="M15.36 0H0.64C0.286 0 0 0.286 0 0.64V15.36C0 15.714 0.286 16 0.64 16H15.36C15.714 16 16 15.714 16 15.36V0.64C16 0.286 15.714 0 15.36 0ZM14.72 14.72H11.038V9.804H13.118L13.43 7.39H11.038V5.848C11.038 5.148 11.232 4.672 12.234 4.672H13.512V2.512C13.29 2.482 12.532 2.416 11.648 2.416C9.804 2.416 8.542 3.542 8.542 5.608V7.388H6.458V9.802H8.544V14.72H1.28V1.28H14.72V14.72Z" />
                                            </svg>FACEBOOK
                                        </asp:LinkButton>
                                    </div>
                                </div>
                                <div class="hnm-login__btn-right">
                                    <p>Do not have an account?</p>
                                    <div class="hnm-login__btn-wrapper">
                                        <a href="SignUp.aspx" title="Sign Up" class="hnm-button">Sign Up</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

