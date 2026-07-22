<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="PaymentDetails.aspx.cs" Inherits="PaymentDetails" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function previewFile() {
            var preview = document.querySelector('#<%=imgPreview.ClientID %>');
            var file = document.querySelector('#<%=GalleryImageUpload.ClientID %>').files[0];
            var reader = new FileReader();

            reader.onloadend = function () {
                preview.src = reader.result;
            }

            if (file) {
                reader.readAsDataURL(file);
            } else {
                preview.src = "";
            }
        }
    </script>
    <script type="text/javascript">
        function popMsg(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '400px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
        function openInvalidMessageModal() {
            $('#InvalidModal').modal('show');
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <div class="hnm-head-with-total">
        <h2 class="hnm-sub-head">Payments</h2>
        <div class="hnm-total-box">
            <div class="hnm-total-box__txt">TOTAL</div>
            <div class="hnm-total-box__amount">$<asp:Label ID="lblTotalAmount" runat="server"></asp:Label></div>
        </div>
    </div>
    <div class="hnm-project-detail">
        <dx:aspxgridview id="GridPayments" runat="server" clientinstancename="GridPayments" width="100%" autogeneratecolumns="False" keyfieldname="PaymentID"
            enablerowscache="false" enablecallbacks="false" datasourceid="dsPaymentSource" styles-alternatingrow-enabled="True" styles-header-backcolor="#597d89" styles-header-forecolor="White">
            <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="false"></settingsadaptivity>
            <settings />
            <columns>
                <dx:gridviewdatatextcolumn fieldname="PaidOn" readonly="True" visibleindex="1" caption="Date Of Payment" cellstyle-horizontalalign="Left" headerstyle-font-bold="true">
                </dx:gridviewdatatextcolumn>
                <dx:gridviewdatatextcolumn fieldname="Method" readonly="True" visibleindex="2" caption="Mode Of Payment" cellstyle-horizontalalign="Left" headerstyle-font-bold="true">
                </dx:gridviewdatatextcolumn>
                <dx:gridviewdatatextcolumn fieldname="Status" readonly="True" visibleindex="3" caption="Status" cellstyle-horizontalalign="Left" headerstyle-font-bold="true">
                </dx:gridviewdatatextcolumn>
                <dx:gridviewdatatextcolumn fieldname="PaidAmount" readonly="True" visibleindex="4" caption="Paid Amount" cellstyle-horizontalalign="Left" headerstyle-font-bold="true">
                </dx:gridviewdatatextcolumn>
                <dx:gridviewdatatextcolumn fieldname="Description" readonly="True" visibleindex="5" caption="Description" cellstyle-horizontalalign="Left" headerstyle-font-bold="true">
                </dx:gridviewdatatextcolumn>
            </columns>
        </dx:aspxgridview>
        <asp:SqlDataSource ID="dsPaymentSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
            SelectCommand="GetProjectPaymentDetails" SelectCommandType="StoredProcedure">
            <SelectParameters>
                <asp:SessionParameter SessionField="ProjectID" Name="ProjectID" />
            </SelectParameters>
        </asp:SqlDataSource>
    </div>
    <div class="hnm-upload-box__outer hnm-r-mt-5">
        <div class="hnm-upload-box">
            <h2 class="hnm-sub-head">Payment</h2>
            <div class="hnm-upload-box__inner">
                <div class="hnm-upload-box__sec-1">
                    <img src="" alt="" class="hnm-upload-box__img" id="imgPreview" runat="server" />
                </div>
                <div class="hnm-upload-box__sec-2">
                    <div class="hnm-upload-box__input-sec">
                        <asp:FileUpload ID="GalleryImageUpload" runat="server" class="hnm-upload-box__input" onchange="previewFile()" />
                        <label for="ContentPlaceHolder1_GalleryImageUpload">
                            <span>Add Images</span><svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="hnm-upload-box__add-icon">
                                <circle cx="20" cy="20" r="19.5" stroke="#5A7E8A" />
                                <path d="M20.583 7.34717V33.4696" stroke="#D9D9D9" stroke-width="2" />
                                <path d="M7.34766 20.5822L33.4701 20.5822" stroke="#D9D9D9" stroke-width="2" />
                            </svg>
                        </label>
                    </div>
                    <div class="hnm-upload-box__btn-sec">
                        <asp:LinkButton ID="lnkSavePaymentImages" runat="server" CssClass="hnm-button" OnClick="lnkSavePaymentImages_Click">ADD</asp:LinkButton>
                    </div>
                </div>
            </div>
        </div>
        <div class="hnm-uploaded-carousal">
            <div class="hnm-uploaded-carousal__inner">
                <asp:Repeater runat="server" ID="rptPaymentImages">
                    <ItemTemplate>
                        <div class="hnm-uploaded-carousal__img-sec" data-toggle="modal" data-target='<%# "#imgSlider" + DataBinder.Eval(Container.DataItem, "PaymentID") %>'>
                            <img src='<%# Eval("ImagePath") %>' alt="image">
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
            </div>
        </div>
    </div>
    <asp:Literal ID="litGalleryImagePopUp" runat="server"></asp:Literal>
    <dx:aspxpopupcontrol id="pcPaymentSave" runat="server" closeaction="CloseButton" closeonescape="true" width="300px"
        popuphorizontalalign="WindowCenter" popupverticalalign="WindowCenter" clientinstancename="pcPaymentSave" headertext="Payment Details">
        <clientsideevents popup="popMsg" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol runat="server">
                <div class="hnm-box-head__cnt">
                    <div class="hnm-input">
                        <p class="hnm-input__text-label">Date of Payment</p>
                        <dx:aspxdateedit id="dtPaymentDate" runat="server" tooltip="Start Date" clientinstancename="dtPaymentDate"
                            cssclass="" displayformatstring="dd/MMM/yyyy HH:mm" editformatstring="dd/MMM/yyyy HH:mm" allownull="false" width="100%" height="30">
                            <validationsettings display="Dynamic" setfocusonerror="True" causesvalidation="true" errordisplaymode="Text" validationgroup="payment">
                                <requiredfield isrequired="true" errortext="Please select the date."></requiredfield>
                            </validationsettings>
                            <timesectionproperties visible="false">
                                <timeeditproperties editformatstring="HH:mm" />
                            </timesectionproperties>
                            <calendarproperties>
                                <fastnavproperties displaymode="Inline" />
                            </calendarproperties>
                        </dx:aspxdateedit>
                        <asp:RequiredFieldValidator ID="rfvDateOfPayment" runat="server" ControlToValidate="dtPaymentDate" ForeColor="Red" ErrorMessage="Please select the date." ValidationGroup="payment" Display="Dynamic"></asp:RequiredFieldValidator>
                    </div>
                    <div class="hnm-input">
                        <p class="hnm-input__text-label">Mode of Payment</p>
                        <asp:DropDownList ID="ddlModeofPayment" runat="server" CssClass="hnm-input__text-label" Width="100%">
                            <asp:ListItem Value="-1" Text="---Select---" Selected="True"></asp:ListItem>
                            <asp:ListItem Value="3" Text="Pay Now"></asp:ListItem>
                        </asp:DropDownList>
                        <asp:RequiredFieldValidator ID="rfvPaymentMode" runat="server" ControlToValidate="ddlModeofPayment" InitialValue="-1" ForeColor="Red" ErrorMessage="Please select mode of payment." ValidationGroup="payment" Display="Dynamic"></asp:RequiredFieldValidator>
                    </div>
                    <div>
                        <asp:LinkButton ID="btnSavePayment" runat="server" Text="save" CssClass="hnm-button" OnClick="btnSavePayment_Click" ValidationGroup="payment" CausesValidation="true"></asp:LinkButton>
                    </div>
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
        <contentstyle>
            <paddings padding="15px" />
        </contentstyle>
    </dx:aspxpopupcontrol>
    <uc1:errordisplay runat="server" id="ErrorDisplay" />
    <div class="modal fade hnm-modal hnm-modal__points" id="InvalidModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog  modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Message</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="hnm-modal__desc"><asp:Label ID="lblPopUpMessage" runat="server"></asp:Label></p>
                </div>
            </div>
        </div>
    </div>
</asp:Content>

