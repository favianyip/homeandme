<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="EmailConfiguration.aspx.cs" Inherits="EmailConfiguration" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Assembly="CKEditor.NET" Namespace="CKEditor.NET" TagPrefix="CKEditor" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function popup(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '600px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ScriptManager ID="ScriptManager1" runat="server"></asp:ScriptManager>

    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <i data-feather="chevron-right" class="breadcrumb__icon"></i>
                    <a href="#" class="breadcrumb--active">Email Configuration</a>
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
                            <h2 class="font-medium text-base mr-auto">Email Configuration
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                            </div>
                        </div>
                        <div id="divRoleGrid" runat="server">
                            <div class="p-5">
                                <div class="preview">
                                    <div class="mt-3 dropDowndxeOuter">
                                        <div class="mt-3 dropDowndxe">
                                            <label>Select Email Option :</label>

                                            <dx:aspxcombobox id="ddlEmailOption" runat="server" cssclass="dateList" datasourceid="EmailConfigSource" textfield="EmailKey" autopostback="true"
                                                valuefield="ItemID" valuetype="System.String" selectedindex="0" width="100%" onselectedindexchanged="ddlEmailOption_SelectedIndexChanged">
                                            </dx:aspxcombobox>

                                            <asp:SqlDataSource ID="EmailConfigSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                SelectCommand="SELECT [EmailKey],ItemID FROM [EmailConfig] ORDER BY [EmailKey]"></asp:SqlDataSource>

                                        </div>
                                        <div class="mt-3 dropDowndxe">
                                            <asp:Button ID="btnNew" runat="server" Text="New" CssClass="button bg-theme-1 text-white mt-6 w-24" OnClick="btnNew_Click" />
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <label>Subject:</label>
                                        <asp:TextBox ID="txtSubject" runat="server" MaxLength="250" Width="100%" CssClass="input w-full border mt-2" />
                                        <asp:RequiredFieldValidator ID="RFSUB" runat="server" ForeColor="Red" SetFocusOnError="true" ErrorMessage="Enter Subject" ControlToValidate="txtSubject" ValidationGroup="Page"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="mt-3">
                                        <label>Email Content:</label>
                                        <ckeditor:ckeditorcontrol id="fckEmail" runat="server" basepath="~/ckeditor" height="500px" width="100%"></ckeditor:ckeditorcontrol>

                                    </div>
                                    <div class="mt-3">
                                        <asp:Button ID="btnSave" runat="server" Class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSave_Click" Text="Save"
                                            ValidationGroup="Page" CausesValidation="true" />
                                        <asp:Button ID="BtnCancel" runat="server" Text="Cancel" OnClick="BtnCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />

                                    </div>
                                    <asp:Label ID="lblMsg" runat="server" ForeColor="Red" Font-Size="Medium" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <dx:aspxpopupcontrol id="popupCreate" runat="server" clientinstancename="popupCreate" popuphorizontalalign="WindowCenter"
                showonpageload="false" popupverticalalign="WindowCenter" showclosebutton="true" showheader="true" headertext="Create" closeaction="CloseButton">
                <clientsideevents popup="popup" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
                <headercontenttemplate>
                    <h4 class="modal-title">Create</h4>
                </headercontenttemplate>
                <contentcollection>
                    <dx:popupcontrolcontentcontrol id="cc2">
                        <div class="p-5">
                            <div class="mt-3">

                                <label>Email Title*:</label>
                                <asp:TextBox ID="txtEmailTitle" runat="server" CssClass="input w-full border mt-2" MaxLength="250" />
                                <asp:RequiredFieldValidator ID="Rfv" runat="server" ControlToValidate="txtEmailTitle" ErrorMessage="Please enter a valid Title for the Email."
                                    ValidationGroup="pass" ForeColor="Red" />
                            </div>
                            <div class="mt-3">
                                <asp:Button ID="btnCreate" runat="server" CssClass="button bg-theme-1 text-white mt-5 w-24" OnClick="btnCreate_Click" CausesValidation="true" ValidationGroup="pass" Text="Create" />
                                <asp:Button ID="btnCreateCancel" runat="server" CssClass="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" Text="Cancel" CausesValidation="false" OnClick="btnCreateCancel_Click" />
                            </div>
                        </div>
                        </div>
                    </dx:popupcontrolcontentcontrol>
                </contentcollection>
            </dx:aspxpopupcontrol>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>


