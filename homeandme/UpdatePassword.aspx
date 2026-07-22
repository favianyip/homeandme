<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="UpdatePassword.aspx.cs" Inherits="UpdatePassword" %>

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
            <!-- Breadcrumb start -->
            <div class="hnm-breadcrumb">
                <div class="content-wrapper">
                    <div class="hnm-breadcrumb__wrapper">
                        <a href="Home.aspx" title="HOME" class="hnm-breadcrumb__item">HOME</a>
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">RESET PASSWORD</a>
                    </div>
                </div>
            </div>
            <!-- Breadcrumb end -->

            <!-- Login Sec Start -->
            <div class="hnm-login" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">RESET PASSWORD</h1>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">New Password*</p>
                                <asp:TextBox ID="txtNewPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqNewPassword" runat="server" ControlToValidate="txtNewPassword" ValidationGroup="password"
                                    class="error" Display="Dynamic" ErrorMessage="Enter new password" ForeColor="Red" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Confirm Password*</p>
                                <asp:TextBox ID="txtConfirmPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqConfirmPassword" runat="server" ControlToValidate="txtConfirmPassword" ValidationGroup="password"
                                    class="hnm-input__error" Display="Dynamic" ErrorMessage="Enter confirm password" ForeColor="Red" />
                                <asp:CompareValidator ID="cvConfirmPassword" runat="server" ControlToValidate="txtConfirmPassword" ControlToCompare="txtNewPassword" 
                                    ValidationGroup="password" class="hnm-input__error" Display="Dynamic" ErrorMessage="password mismatch" ForeColor="Red"></asp:CompareValidator>  
                          </div>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <div class="hnm-login__btn-wrapper">
                                        <asp:LinkButton ID="lnkSubmit" runat="server" CssClass="hnm-button" CausesValidation="true" ValidationGroup="password" OnClick="lnkSubmit_Click">Submit</asp:LinkButton>
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
            <!-- Login Sec End -->
            <!-- Popup Start -->
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
                                <asp:Label ID="lblMessage" runat="server"></asp:Label></p>
                            <div class="hnm-modal__btn" id="divpopUpbtn" runat="server">
                                <a href="Login.aspx" class="hnm-button">Go to Login Page</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Popup End -->
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

