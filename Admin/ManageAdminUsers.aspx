<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageAdminUsers.aspx.cs" Inherits="Admin_ManageAdminUsers" %>

<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="uc1" TagName="AccountMenu" %>


<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function onlyNumbers(evt) {
            var e = event || evt; 
            var charCode = e.which || e.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57))
                return false;
            return true;
            if (charCode != 43 && charCode > 31 && (charCode < 48 || charCode > 57))
                return false;
            return true;
        }
    </script>
    <script type="text/javascript">
        function popup(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');

            s.UpdatePosition();
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <asp:UpdatePanel runat="server" UpdateMode="Always">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <i data-feather="chevron-right" class="breadcrumb__icon"></i>
                    <a href="#" class="breadcrumb--active">User Management</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <uc1:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Users
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:Button ID="btnAddNew" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1 xl:mr-3" Text="Add New" OnClick="btnAddNew_Click" />
                            </div>
                        </div>
                        <div id="divUserGrid" runat="server">
                            <div class="p-5">
                                <div class="preview">
                                    <dx:ASPxGridView ID="GridUsers" runat="server" ClientInstanceName="GridUsers" Width="100%" AutoGenerateColumns="False" KeyFieldName="AdminUserID"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="UsersSource">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="Name" Caption="Full name" Width="100px">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="RegisteredOn" Caption="Registered Date" Width="100px">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="Email" AdaptivePriority="2">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="Mobile" Caption="Mobile" Width="100px">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataColumn FieldName="AdminUserID" Width="200px" Caption="#" AdaptivePriority="0">
                                                <DataItemTemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="lnkEdit" runat="server" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkEdit_Click" CommandArgument='<% #Bind("AdminUserID")%>'>Edit</asp:LinkButton>
                                                                <asp:LinkButton ID="lnkResetPassword" runat="server" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkResetPassword_Click" CommandArgument='<% #Bind("AdminUserID")%>'>Reset Password</asp:LinkButton>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DataItemTemplate>
                                                <Settings AllowHeaderFilter="False" AllowAutoFilter="False" />
                                            </dx:GridViewDataColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="false" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="UsersSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetAdminUsers"></asp:SqlDataSource>
                                    <asp:HiddenField ID="hdnUserID" runat="server" />
                                    <asp:HiddenField ID="hdnAdminUserID" runat="server" />
                                </div>
                            </div>
                        </div>
                        <div id="divUserForm" runat="server" visible="false">
                            <div class="p-5" id="vertical-form">
                                <div class="preview">
                                    <div>
                                        <label>Name</label>
                                        <asp:TextBox runat="server" ID="txtName" CssClass="input w-full border mt-2" Width="100%"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="reqName" runat="server" ControlToValidate="txtName" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the name." ValidationGroup="User" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="mt-3">
                                        <label>Email</label>
                                        <asp:TextBox runat="server" ID="txtUserEmail" CssClass="input w-full border mt-2" Width="100%"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqEmail" runat="server" ControlToValidate="txtUserEmail" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the email." ValidationGroup="User" Display="Dynamic"></asp:RequiredFieldValidator>
                                        <asp:RegularExpressionValidator ID="revEmail" runat="server" Display="Dynamic" ForeColor="Red"
                                            ErrorMessage="Invalid Email" ControlToValidate="txtUserEmail"
                                            SetFocusOnError="True"
                                            ValidationExpression="\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*">
                                        </asp:RegularExpressionValidator>
                                    </div>
                                    <div class="mt-3">
                                        <label>Mobile</label>
                                        <asp:TextBox runat="server" ID="txtMobile" CssClass="input w-full border mt-2" Width="100%" MaxLength="12" onKeyPress="return onlyNumbers(this);"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqMobile" runat="server" ControlToValidate="txtMobile" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the mobile number." ValidationGroup="User" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <asp:Button ID="btnSaveUsers" runat="server" class="button bg-theme-1 text-white mt-5 w-24" Text="SAVE" ValidationGroup="User" OnClick="btnSaveUsers_Click"></asp:Button>
                                    <asp:Button ID="btnCancel" runat="server" class="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" Text="CANCEL" CausesValidation="false" OnClick="btnCancel_Click"></asp:Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" />
            <dx:ASPxPopupControl ID="popReset" runat="server" ClientInstanceName="popReset" Width="400px"
                Modal="True" Height="250px" ShowCloseButton="true" PopupHorizontalAlign="WindowCenter"
                PopupVerticalAlign="WindowCenter" EnableHierarchyRecreation="True" AppearAfter="1000"
                DisappearAfter="1500" ShowPageScrollbarWhenModal="False" Border-BorderWidth="0px"
                CloseAction="CloseButton" HeaderText="">
                <ModalBackgroundStyle BackColor="Gray" Opacity="50">
                </ModalBackgroundStyle>
                <Border BorderWidth="0px"></Border>
                <ClientSideEvents PopUp="popup" Shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
                <ContentCollection>
                    <dx:PopupControlContentControl ID="PopupControlContentControl1" runat="server">
                        <div class="p-5" id="vertical-form">
                            <div class="preview">
                                <div>
                                    <label>Password</label>
                                    <asp:TextBox runat="server" ID="txtPassword" CssClass="input w-full border mt-2" Width="100%" TextMode="Password"></asp:TextBox>
                                    <asp:RequiredFieldValidator ID="RequiredFieldValidator1" runat="server" ControlToValidate="txtPassword" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the password." ValidationGroup="password" Display="Dynamic"></asp:RequiredFieldValidator>
                                </div>
                                <div class="mt-3">
                                    <label>Confirm Password</label>
                                    <asp:TextBox runat="server" ID="txtConfirmPassword" CssClass="input w-full border mt-2" Width="100%" TextMode="Password"></asp:TextBox>
                                    <asp:RequiredFieldValidator ID="RequiredFieldValidator2" runat="server" ControlToValidate="txtConfirmPassword" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the confirm password." ValidationGroup="password" Display="Dynamic"></asp:RequiredFieldValidator>
                                    <asp:CompareValidator ID="cvPassword" runat="server" ControlToValidate="txtConfirmPassword" ControlToCompare="txtPassword" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Password mismatch." ValidationGroup="password" Display="Dynamic"></asp:CompareValidator>
                                </div>
                                <div class="mt-2">
                                    <asp:Label ID="lblPasswordMessage" runat="server" ForeColor="Red"></asp:Label>
                                </div>
                                <asp:Button ID="btnPasswordUpdate" runat="server" class="button bg-theme-1 text-white mt-5 w-24" Text="SAVE" ValidationGroup="password" OnClick="btnPasswordUpdate_Click"></asp:Button>
                            </div>
                        </div>
                    </dx:PopupControlContentControl>
                </ContentCollection>
            </dx:ASPxPopupControl>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>


