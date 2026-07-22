<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="CollectionConfiguration.aspx.cs" Inherits="Admin_CollectionConfiguration" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageServiceRate.aspx" class="breadcrumb--active">Manage Service Rate</a>
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
                            <h2 class="font-medium text-base mr-auto">Data Collection
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="lnkBack" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Back" ToolTip="Back" OnClick="lnkBack_Click" />
                            </div>
                        </div>
                        <div class="p-5">
                            <div class="preview">
                                <div class="breadcrumb mt-3">
                                    <b>
                                        <asp:Label ID="lblOptionLevel" runat="server"></asp:Label></b>
                                </div>
                                <div class="mt-3">
                                    <label>Measurements :</label>
                                    <div class="flex flex-col sm:flex-row mt-2">
                                        <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            <asp:CheckBox ID="cbLength" runat="server" class="input border mr-1" />
                                            <label for="cbLength" class="cursor-pointer select-none">Length(ft)</label>
                                        </div>
                                        <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            <asp:CheckBox ID="cbWidth" runat="server" class="input border mr-1" />
                                            <label for="cbWidth" class="cursor-pointer select-none">Width(ft)</label>
                                        </div>
                                        <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            <asp:CheckBox ID="cbHeight" runat="server" class="input border mr-1" />
                                            <label for="cbHeight" class="cursor-pointer select-none">Height(ft)</label>
                                        </div>
                                        <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            <asp:CheckBox ID="cbThickness" runat="server" class="input border mr-1" />
                                            <label for="cbThickness" class="cursor-pointer select-none">Thickness(ft)</label>
                                        </div>
                                        <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            <asp:CheckBox ID="cbQuantity" runat="server" class="input border mr-1" />
                                            <label for="cbQuantity" class="cursor-pointer select-none">Quantity</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-col sm:flex-row">
                                    <div class="data-collect">
                                        <label>Display text for Length :</label>
                                        <asp:TextBox ID="txtLengthText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqLengthText" runat="server" ControlToValidate="txtLengthText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="data-collect">
                                        <label>Default Value for Length :</label>
                                        <asp:TextBox ID="txtLength" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-col sm:flex-row">
                                    <div class="data-collect">
                                        <label>Display text for Width :</label>
                                        <asp:TextBox ID="txtWidthText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqWidthText" runat="server" ControlToValidate="txtWidthText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="data-collect">
                                        <label>Default Value for Width :</label>
                                        <asp:TextBox ID="txtWidth" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-col sm:flex-row">
                                    <div class="data-collect">
                                        <label>Display text for Height :</label>
                                        <asp:TextBox ID="txtHeightText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqHeightText" runat="server" ControlToValidate="txtHeightText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="data-collect">
                                        <label>Default Value for Height :</label>
                                        <asp:TextBox ID="txtHeight" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-col sm:flex-row">
                                    <div class="data-collect">
                                        <label>Display text for Thickness :</label>
                                        <asp:TextBox ID="txtThicknessText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqThicknessText" runat="server" ControlToValidate="txtThicknessText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="data-collect">
                                        <label>Default Value for Thickness :</label>
                                        <asp:TextBox ID="txtThickness" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                </div>
                                <div class="mt-3 flex flex-col sm:flex-row">
                                    <div class="data-collect">
                                        <label>Display text for Quantity :</label>
                                        <asp:TextBox ID="txtQuantityText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="ReqQuantityText" runat="server" ControlToValidate="txtQuantityText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="data-collect">
                                        <label>Default Value for Quantity :</label>
                                        <asp:TextBox ID="txtQuantity" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <asp:Button ID="btnSubmit" runat="server" Text="Save" CssClass="button bg-theme-1 text-white mt-5  w-24" OnClick="btnSubmit_Click" CausesValidation="true" ValidationGroup="Rate" />
                                    <asp:Button ID="btnCancel" runat="server" Text="Cancel" OnClick="btnCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                </div>
                                <asp:Label ID="lblMsg" runat="server" ForeColor="Red" Font-Size="Medium" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

