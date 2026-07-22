<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="Test.aspx.cs" Inherits="Test" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script>
        function onlyNumbers(evt) {
            var e = event || evt;
            var charCode = e.which || e.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57))
                return false;
            return true;
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <div class="hnm-checkout">
        <div class="content-wrapper">
            <div class="hnm-head-with-total">
                <h2 class="hnm-sub-head">Check Out</h2>
                <div class="hnm-total-box">
                    <div class="hnm-total-box__txt">TOTAL</div>
                    <div class="hnm-total-box__amount">$<asp:Label ID="lblTotalProjectCost" runat="server"></asp:Label></div>
                </div>
            </div>
            <div class="hnm-box-head hnm-box-head--two-col">
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Site address</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Name</p>
                            <asp:TextBox ID="txtSiteAdddressName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Mobile</p>
                            <asp:TextBox ID="txtSiteAddressMobile" runat="server" CssClass="hnm-input__text" MaxLength="20"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Zip</p>
                            <asp:TextBox ID="txtSiteAddressZipCode" runat="server" CssClass="hnm-input__text" onKeyPress="return onlyNumbers(this);"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 1</p>
                            <asp:TextBox ID="txtSiteAddress1" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 2</p>
                            <asp:TextBox ID="txtSiteAddress2" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">State</p>
                            <asp:TextBox ID="txtSiteAddressState" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Country</p>
                            <asp:TextBox ID="txtSiteAddressCountry" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                    </div>
                </div>
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Billing address</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Name</p>
                            <asp:TextBox ID="txtBillingAddressName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Mobile</p>
                            <asp:TextBox ID="txtBillingAddressMobile" runat="server" CssClass="hnm-input__text" MaxLength="20"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Zip</p>
                            <asp:TextBox ID="txtBillingAddressZipCode" runat="server" CssClass="hnm-input__text" onKeyPress="return onlyNumbers(this);"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 1</p>
                            <asp:TextBox ID="txtBillingAddress1" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 2</p>
                            <asp:TextBox ID="txtBillingAddress2" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">State</p>
                            <asp:TextBox ID="txtBillingAddressState" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Country</p>
                            <asp:TextBox ID="txtBillingAddressCountry" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hnm-check-box hnm-checkout__check-addrs">
                <label>
                    <asp:CheckBox ID="chkIsSameAddress" runat="server" Checked="false" OnCheckedChanged="chkIsSameAddress_CheckedChanged" AutoPostBack="true" />
                    <span class="hnm-check-box__check"></span>
                    My billing address is the same as site address
                </label>
            </div>
            <div class="hnm-doc-box">
                <p class="hnm-doc-box__head">Documents</p>
                <div class="hnm-doc-box__inner">
                    <div class="hnm-doc-box__sec-1">
                        <p class="hnm-doc-box__text">You can upload the documents later from projects details section in your account</p>
                        <a class="hnm-button hnm-button--secondary" data-toggle="modal" data-target="#uploadDocumentsModal" href="javascript:void(0)">upload Documents</a>
                        <!-- Upload documents Popup Start -->
                        <div class="modal fade hnm-modal hnm-modal--upload-docs" id="uploadDocumentsModal" tabindex="-1" aria-hidden="true">
                            <div class="modal-dialog  modal-dialog-centered">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Upload pending documents</h5>
                                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="hnm-modal__upload-box">
                                            <p class="hnm-modal__desc">Upload Floor Plan:</p>
                                            <p class="hnm-modal__text-grey">Please upload the floor plan (PDF, JPG or PNG) Image can be a maximum of 16 MB in size</p>
                                            <div class="hnm-uploadfiletext">
                                                <asp:Label ID="lblFloorPlanFile" runat="server"></asp:Label>
                                            </div>
                                            <div class="hnm-file">
                                                <asp:FileUpload ID="FloorPlanUpload" runat="server" class="hnm-file__input" />
                                                <p class="hnm-file__txt"></p>
                                                <label for="ContentPlaceHolder1_FloorPlanUpload" class="hnm-button">Browse</label>
                                            </div>
                                            <asp:RegularExpressionValidator ID="ReqFloorUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                                ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                                SetFocusOnError="true" ControlToValidate="FloorPlanUpload" ValidationGroup="Page" ForeColor="Red"
                                                Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                        </div>
                                        <div class="hnm-modal__upload-box">
                                            <p class="hnm-modal__desc">Upload renovation permit:</p>
                                            <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                            <div class="hnm-uploadfiletext">
                                                <asp:Label ID="lblRenovationPermitFile" runat="server"></asp:Label>
                                            </div>
                                            <div class="hnm-file">
                                                <asp:FileUpload ID="RenovationPermitUpload" runat="server" class="hnm-file__input" />
                                                <p class="hnm-file__txt"></p>
                                                <label for="ContentPlaceHolder1_RenovationPermitUpload" class="hnm-button">Browse</label>
                                            </div>
                                            <asp:RegularExpressionValidator ID="ReqRenovationPermit" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                                ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                                SetFocusOnError="true" ControlToValidate="RenovationPermitUpload" ValidationGroup="Page" ForeColor="Red"
                                                Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                        </div>
                                        <div class="hnm-modal__upload-box">
                                            <p class="hnm-modal__desc">Upload Indemnity:</p>
                                            <p class="hnm-modal__text-grey">Please upload the Indemnity form (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                            <div class="hnm-uploadfiletext">
                                                <asp:Label ID="lblIndemnityFile" runat="server"></asp:Label>
                                            </div>
                                            <div class="hnm-file">
                                                <asp:FileUpload ID="IndemnityFileUpload" runat="server" class="hnm-file__input" />
                                                <p class="hnm-file__txt"></p>
                                                <label for="ContentPlaceHolder1_IndemnityFileUpload" class="hnm-button">Browse</label>
                                            </div>
                                            <asp:RegularExpressionValidator ID="ReqIndemnityFileUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                                ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                                SetFocusOnError="true" ControlToValidate="IndemnityFileUpload" ValidationGroup="Page" ForeColor="Red"
                                                Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                        </div>
                                        <div class="hnm-modal__btn">
                                            <button class="hnm-button hnm-button--secondary" data-dismiss="modal" aria-label="Close">Cancel</button>
                                            <asp:LinkButton ID="lnkSaveFiles" runat="server" CssClass="hnm-button" OnClick="lnkSaveFiles_Click">Save</asp:LinkButton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Upload documents Popup End -->
                    </div>
                    <div class="hnm-doc-box__sec-2">
                        <p class="hnm-doc-box__text">You can download these forms for submission later</p>
                        <asp:Repeater ID="rptDocuments" runat="server">
                            <ItemTemplate>
                                <asp:UpdatePanel ID="upDocuments" runat="server" UpdateMode="Always">
                                    <ContentTemplate>
                                        <p class="hnm-doc-box__download">
                                            <%# Eval("ItemText") %>
                                            <asp:LinkButton ID="lnkDocumentForm" runat="server" CssClass="hnm-doc-box__download-link" CommandArgument='<%# Eval("ItemFileURL") %>' OnClick="lnkDocumentForm_Click">
                                             Download Form</asp:LinkButton>
                                        </p>
                                    </ContentTemplate>
                                    <Triggers>
                                        <asp:PostBackTrigger ControlID="lnkDocumentForm" />
                                    </Triggers>
                                </asp:UpdatePanel>
                            </ItemTemplate>
                        </asp:Repeater>
                    </div>
                </div>
            </div>
            <div class="hnm-checkout__wrapper">
                <div class="hnm-doc-box hnm-checkout__loan-box">
                    <div class="hnm-checkout__title">Wish to Avail Loan?</div>
                    <div class="hnm-checkout__check-wrapper">
                        <div class="hnm-check-box">
                            <label>
                                <asp:CheckBox runat="server" ID="chkIsLoan" Checked="true" OnCheckedChanged="chkIsLoan_CheckedChanged" AutoPostBack="true" />
                                <span class="hnm-check-box__check"></span>
                                Yes
                            </label>
                        </div>
                        <div class="hnm-check-box">
                            <label>
                                <asp:CheckBox runat="server" ID="chkNoLoan" Checked="false" OnCheckedChanged="chkNoLoan_CheckedChanged" AutoPostBack="true" />
                                <span class="hnm-check-box__check"></span>No</label>
                        </div>
                    </div>
                    <div id="DivLoan" runat="server" visible="true">
                        <div class="hnm-checkout__title">Adjust your loan amount</div>
                        <div class="hnm-checkout__loan-outer">
                            <div class="hnm-checkout__loan-slider">
                                <dx:ASPxTrackBar ID="LoanAmountTrackBar" runat="server" AutoPostBack="true" Height="50px"
                                    LargeTickInterval="20000" MaxValue="100000" MinValue="1000" PositionEnd="100000" PositionStart="1000"
                                    ScalePosition="LeftOrTop" Step="1" ClientInstanceName="tbSale" LargeTickEndValue="100000" LargeTickStartValue="20000"
                                    ValueChangedDelay="1000" Width="100%" Theme="Moderno" OnPositionChanged="LoanAmountTrackBar_PositionChanged">
                                </dx:ASPxTrackBar>
                            </div>
                            <div class="hnm-checkout__input-box">
                                <span class="hnm-checkout__input-value">SGD</span>
                                <asp:TextBox ID="txtLoanAmount" runat="server" Text="1000" onKeyPress="return onlyNumbers(this);" OnTextChanged="txtLoanAmount_TextChanged" AutoPostBack="true"></asp:TextBox>
                                <asp:HiddenField ID="HdnLoanAmount" runat="server" />
                            </div>
                        </div>
                        <div class="hnm-checkout__title">Loan Application forms</div>
                        <asp:Repeater ID="rptbanks" runat="server">
                            <ItemTemplate>
                                <asp:UpdatePanel ID="upBanks" runat="server" UpdateMode="Always">
                                    <ContentTemplate>
                                        <p class="hnm-doc-box__download">
                                            <%# Eval("ItemText") %>
                                            <asp:LinkButton ID="btnBankForm" runat="server" Text="Download Form" CssClass="hnm-doc-box__download-link" CommandArgument='<%# Eval("ItemFileURL") %>' OnClick="btnBankForm_Click"></asp:LinkButton>
                                        </p>
                                    </ContentTemplate>
                                    <Triggers>
                                        <asp:PostBackTrigger ControlID="btnBankForm" />
                                    </Triggers>
                                </asp:UpdatePanel>
                            </ItemTemplate>
                        </asp:Repeater>
                    </div>
                    <div class="hnm-tooltip">
                        <label for="toolTip" class="hnm-tooltip__label">
                            <span class="hnm-tooltip__text">Loan  Payment calculation</span>
                            <img src="../assets/images/notice-icon.svg" alt="!" class="hnm-tooltip__icon">
                        </label>
                        <input type="checkbox" id="toolTip" class="hnm-tooltip__input">
                        <div class="hnm-tooltip__drop-down">
                            <p class="hnm-tooltip__desc">Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.</p>
                        </div>
                    </div>
                </div>
                <div class="hnm-checkout__date-outer">
                    <div class="hnm-checkout__title">Select your prefered timeslot for Subcontractor visit</div>
                    <div class="hnm-checkout__date" id="DivDateSelect" runat="server">
                        <dx:ASPxDateEdit ID="DtDate" runat="server" ClientInstanceName="DtDate"
                            CssClass="dateList mt-2" DisplayFormatString="MMM-dd-yyyy hh:mm tt" EditFormatString="dd/MMM/yyyy HH:mm" AllowNull="false"
                            Width="100%" Height="30" NullText="SELECT DATE AND TIME" AllowUserInput="false" OnDateChanged="DtDate_DateChanged"
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
                    <div class="hnm-checkout__date-value-outer" id="DivDateValue" runat="server" visible="false">
                        <p class="hnm-checkout__date-value">
                            You have requested for a sub-contractor visit on 
                                    <asp:Label ID="lblRequestedDate" runat="server"></asp:Label>
                            at 
                                    <asp:Label ID="lblRequestedTime" runat="server"></asp:Label>
                        </p>
                        <div class="hnm-checkout__edit-btn">
                            <asp:LinkButton ID="DateEdit" runat="server" CssClass="hnm-button" OnClick="DateEdit_Click">EDIT</asp:LinkButton>
                        </div>
                    </div>
                    <br />
                    <asp:Label ID="lblDateMsg" runat="server" ForeColor="Red"></asp:Label>
                    <div class="hnm-checkout__btn">
                        <asp:LinkButton ID="lnkProceed" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="lnkProceed_Click">PROCEED TO CHECKOUT</asp:LinkButton>
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>
