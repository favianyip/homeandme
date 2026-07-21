<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="ForgotPassword.aspx.cs" Inherits="ForgotPassword" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function openMessageModal() {
            $('#messagePopUp').modal('show');
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <div class="hnm-breadcrumb">
                <div class="content-wrapper">
                    <div class="hnm-breadcrumb__wrapper">
                        <a href="Home.aspx" title="HOME" class="hnm-breadcrumb__item">HOME</a>
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">Forgot Password</a>
                    </div>
                </div>
            </div>
            <div class="hnm-login" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">FORGOT PASSWORD</h1>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Email address*</p>
                                <asp:TextBox ID="txtEmailAddress" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqemail" runat="server" ControlToValidate="txtEmailAddress" ValidationGroup="forgotpassword"
                                    class="error" Display="Dynamic" ErrorMessage="Enter email address" ForeColor="Red" />
                                <asp:RegularExpressionValidator ID="revemail" runat="server" ControlToValidate="txtEmailAddress" ValidationGroup="forgotpassword"
                                    class="hnm-input__error" ValidationExpression="^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$"
                                    Display="Dynamic" ErrorMessage="Please enter a valid email address" ForeColor="Red" />
                            </div>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <div class="hnm-login__btn-wrapper">
                                        <asp:LinkButton ID="lnkSubmit" runat="server" CssClass="hnm-button" CausesValidation="true" ValidationGroup="forgotpassword" OnClick="lnkSubmit_Click">Submit</asp:LinkButton>
                                    </div>
                                </div>
                                <div class="hnm-login__btn-right">
                                    <div class="hnm-login__btn-wrapper">
                                        <a href="Login.aspx" title="Sign Up" class="hnm-button">Login</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal fade hnm-modal hnm-modal__points" id="messagePopUp" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Password Update</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">
                                <asp:Label ID="lblMessage" runat="server"></asp:Label>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

