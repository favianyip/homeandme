<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageServiceRate.aspx.cs" Inherits="Admin_ManageServiceRate" %>

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
                    <a href="#" class="breadcrumb--active">Manage Service Rate</a>
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
                            <h2 class="font-medium text-base mr-auto">Service Rates
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                            </div>
                        </div>
                        <div id="divServiceRatesGrid" runat="server">
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:ASPxGridView ID="GridServiceRate" runat="server" ClientInstanceName="GridServiceRate" Width="100%" AutoGenerateColumns="False" DataSourceID="ServiceRateSource"
                                        EnableRowsCache="false" EnableCallBacks="false" Styles-AlternatingRow-Enabled="True" KeyFieldName="SubsubOptionL3ID">
                                        <Settings ShowFilterRow="true" />
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="false"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="SubsubOptionL3ID" ReadOnly="True" VisibleIndex="0" HeaderStyle-Font-Bold="true" Visible="false" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="Scope" ReadOnly="True" VisibleIndex="1" Caption="WorkType" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="OptionName" ReadOnly="True" VisibleIndex="2" Caption="Product Category" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="SubOption" ReadOnly="True" VisibleIndex="3" Caption="Product" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="SubsubOption" ReadOnly="True" VisibleIndex="4" Caption="Product Option 1" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="SubsubOptionL2" ReadOnly="True" VisibleIndex="5" Caption="Product Option 2" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="SubsubOptionL3" ReadOnly="True" VisibleIndex="6" Caption="Product Option 3" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="UOM" ReadOnly="True" VisibleIndex="7" Caption="UOM" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="Rate" ReadOnly="True" VisibleIndex="8" Caption="Price" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn VisibleIndex="9" Caption="#" HeaderStyle-Font-Bold="true">
                                                <DataItemTemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2 mangSerRateOptBut">
                                                                <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" OnClick="btnEdit_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<%# Eval("SubsubOptionL3ID") %>' />
                                                                <asp:LinkButton ID="btnDataCollection" runat="server" Text="Data Collection" OnClick="btnDataCollection_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<%# Eval("SubsubOptionL3ID") %>' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DataItemTemplate>
                                            </dx:GridViewDataTextColumn>
                                        </Columns>
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="ServiceRateSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetAllServiceRates"></asp:SqlDataSource>
                                    <asp:HiddenField ID="hdnSubsubOptionL3ID" runat="server" />
                                </div>
                            </div>
                        </div>
                        <div id="divRateForm" runat="server" visible="false">
                            <div class="p-5">
                                <div class="preview">
                                    <div class="breadcrumb mt-3">
                                        <b>
                                            <asp:Label ID="lblOptionLevel" runat="server"></asp:Label></b>
                                    </div>
                                    <div class="mt-3">
                                        <label>UOM :</label>
                                        <dx:ASPxComboBox ID="cmbUOM" runat="server" CssClass="dateList" ValueType="System.String" SelectedIndex="0" Width="100%"
                                            OnSelectedIndexChanged="cmbUOM_SelectedIndexChanged" AutoPostBack="true">
                                            <Items>
                                                <dx:ListEditItem Text="--Select--" Value="-1" />
                                                <dx:ListEditItem Text="Measurement" Value="1" />
                                                <dx:ListEditItem Text="Quantity" Value="2" />
                                            </Items>
                                        </dx:ASPxComboBox>
                                    </div>
                                    <div class="mt-3" id="divMeasurement" runat="server" visible="false">
                                        <label>Measurements :</label>
                                        <div class="flex flex-col sm:flex-row mt-2">
                                            <div class="flex items-center text-gray-700 mr-3 mb-2" style="display: none">
                                                <asp:CheckBox ID="cbHeight" runat="server" class="input border mr-1" />
                                                <label for="cbHeight" class="cursor-pointer select-none">Height(ft)</label>
                                            </div>
                                            <div class="flex items-center text-gray-700 mr-3 mb-2">
                                                <asp:CheckBox ID="cbLength" runat="server" class="input border mr-1" />
                                                <label for="cbLength" class="cursor-pointer select-none">Length(ft)</label>
                                            </div>
                                            <div class="flex items-center text-gray-700 mr-3 mb-2">
                                                <asp:CheckBox ID="cbWidth" runat="server" class="input border mr-1" />
                                                <label for="cbWidth" class="cursor-pointer select-none">Width(ft)</label>
                                            </div>
                                            <div class="flex items-center text-gray-700 mr-3 mb-2" style="display: none">
                                                <asp:CheckBox ID="cbThickness" runat="server" class="input border mr-1" />
                                                <label for="cbThickness" class="cursor-pointer select-none">Thickness(ft)</label>
                                            </div>
                                            <div class="flex items-center text-gray-700 mr-3 mb-2">
                                            </div>
                                            <div class="flex items-center text-gray-700 mr-3 mb-2">
                                                <label for="cbMeasurementText" class="cursor-pointer select-none"><b>1*1 = 1 Sqft</b></label>
                                            </div>
                                        </div>
                                    </div>
                                    <div id="DivMeasurementText" runat="server">
                                        <div class="mt-3">
                                            <label>Display text for Length :</label>
                                            <asp:TextBox ID="txtLengthText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                            <asp:RequiredFieldValidator ID="ReqLengthText" runat="server" ControlToValidate="txtLengthText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                        </div>
                                        <div class="mt-3">
                                            <label>Display text for Width :</label>
                                            <asp:TextBox ID="txtWidthText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                            <asp:RequiredFieldValidator ID="ReqWidthText" runat="server" ControlToValidate="txtWidthText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                        </div>
                                    </div>
                                    <div id="DivNumbersText" runat="server">
                                        <div class="mt-3">
                                            <label>Quantity : <b>1</b></label>
                                        </div>
                                        <div class="mt-3">
                                            <label>Display text for Quantity :</label>
                                            <asp:TextBox ID="txtQuantityText" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                            <asp:RequiredFieldValidator ID="ReqQuantityText" runat="server" ControlToValidate="txtQuantityText" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Rate" Display="Dynamic"></asp:RequiredFieldValidator>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <label>Price:*</label>
                                        <asp:TextBox ID="txtPrice" runat="server" Text="" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                    <div class="mt-3">
                                        <asp:Button ID="BtnSubmitPrice" runat="server" Text="Save" AutoPostBack="true" CssClass="button bg-theme-1 text-white mt-5  w-24" OnClick="BtnSubmitPrice_Click" ValidationGroup="Rate" CausesValidation="true" />
                                        <asp:Button ID="BtnCancel" runat="server" Text="Cancel" OnClick="BtnCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                    </div>
                                    <asp:Label ID="lblMsg" runat="server" ForeColor="Red" Font-Size="Medium" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

