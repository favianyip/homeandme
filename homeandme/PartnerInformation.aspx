<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="PartnerInformation.aspx.cs" Inherits="PartnerInformation" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <h3 class="hnm-sub-head">Partner Information</h3>
            <div class="hnm-dashboard__contract">
                <asp:Repeater runat="server" ID="rptProjectPartners">
                    <ItemTemplate>
                        <div class="hnm-box-head hnm-dashboard__contract-box">
                            <div class="hnm-box-head__inner">
                                <h3 class="hnm-box-head__title">Contractor name: <%# Eval("PartnerName") %></h3>
                                <div class="hnm-box-head__cnt">
                                    <div class="hnm-dashboard__contract-row">
                                        <p class="hnm-dashboard__contract-title">Job Type:</p>
                                        <p class="hnm-dashboard__contract-cnt"><%# Eval("Skills") %></p>
                                    </div>
                                    <div class="hnm-dashboard__contract-row">
                                        <p class="hnm-dashboard__contract-title">Contact Number: </p>
                                        <p class="hnm-dashboard__contract-cnt"><%# Eval("Contact") %></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
            </div>
            <div class="hnm-dashboard__time-slot" id="DivDateValue" runat="server" visible="false">
                <p class="hnm-dashboard__time-slot-title">Your Prefered time slot :</p>
                <p class="hnm-dashboard__time-slot-cnt" id="TimeSlot" runat="server">
                    You have requested for a sub-contractor visit on <strong>
                        <asp:Label ID="lblRequestedDate" runat="server"></asp:Label></strong>
                    at <strong>
                        <asp:Label ID="lblRequestedTime" runat="server"></asp:Label></strong>
                </p>
            </div>
            <div class="hnm-dashboard__time-slot-outer" id="DivDateSelect" runat="server" visible="false">
                <div class="hnm-dashboard__time-slot-title">Select your preferred timeslot for Subcontractor visit</div>
                <div class="hnm-dashboard__time-slot-cnt" id="P1" runat="server">
                    <dx:ASPxDateEdit ID="DtDate" runat="server" ClientInstanceName="DtDate"
                        CssClass="dateList mt-2" DisplayFormatString="MMM-dd-yyyy hh:mm tt" EditFormatString="dd/MMM/yyyy HH:mm" AllowNull="false"
                        Width="50%" Height="30" NullText="SELECT DATE AND TIME" AllowUserInput="false" OnDateChanged="DtDate_DateChanged"
                        AutoPostBack="true">
                        <ValidationSettings Display="Dynamic" SetFocusOnError="True" CausesValidation="false" ErrorDisplayMode="ImageWithTooltip">
                            <RequiredField IsRequired="false"></RequiredField>
                        </ValidationSettings>
                        <TimeSectionProperties Visible="true">
                            <TimeEditProperties EditFormatString="HH:mm" />
                        </TimeSectionProperties>
                        <CalendarProperties>
                            <FastNavProperties DisplayMode="Inline" />
                        </CalendarProperties>
                    </dx:ASPxDateEdit>
                </div>
                <br />
                <asp:Label ID="lblDateMsg" runat="server" ForeColor="Red"></asp:Label>
                <div class="dashboard__time-slot__btn">
                    <asp:LinkButton ID="lnkSave" runat="server" CssClass="hnm-button hnm-button--secondary" ValidationGroup="address" CausesValidation="true" OnClick="lnkSave_Click">SAVE</asp:LinkButton>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

