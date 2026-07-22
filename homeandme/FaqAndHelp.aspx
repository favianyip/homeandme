<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="FaqAndHelp.aspx.cs" Inherits="FaqAndHelp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <div class="faq content-wrapper">
        <div class="grey-box grey-box--centered hnm-r-mt-6 hnm-r-mb-5">
            <h1 class="hnm-main-head">FAQ</h1>
            <p class="grey-box__text">Read our frequently asked questions and get quick answers to your question</p>
        </div>
        <p class="faq__pencil-txt">Having questions that not on the list? <a href="Contactus.aspx">Send us a message!</a></p>
        <div class="hnm-accordion" id="hnmAccordion">
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header collapsed" id="headingOne" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                    <h2 class="hnm-accordion__title">Any hidden cost that is not specified in the Home And Me online platform?</h2>

                </div>
                <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        No. Home And Me is an online renovation platform that offer you an outstanding solution to complete your home cost efficiently and transparently. 
                        However, the additional request and work that is not directed from our online platform is not covered.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingTwo" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                    <h2 class="hnm-accordion__title">How is Home And Me plan the work schedule?</h2>
                </div>
                <div id="collapseTwo" class="collapse" aria-labelledby="headingTwo" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        After the item have been selected and the order is completed, your project will be directed to the Home And Me administrator. 
                        Upon receiving a down payment of 10% of total cost, subcontractor will be assigned to visit you, at your preferred time for your convenience. 
                        After both parties come to an agreement for the date of commencement of works, the renovation work schedule will be updated in the platform and you will be notified via email. 
                        The project completion date thus will be finalized after all the physical measurement taking is completed.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingThree" data-toggle="collapse" data-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                    <h2 class="hnm-accordion__title">Any warranty on work done?</h2>
                </div>
                <div id="collapseThree" class="collapse" aria-labelledby="headingThree" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        General renovation work such as carpentry, and electrical work are workmanship faulty covered for 1 year and the wet work such as tiling and water proofing are workmanship faulty covered for 5 years.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingFour" data-toggle="collapse" data-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour">
                    <h2 class="hnm-accordion__title">What is the payment progression?</h2>
                </div>
                <div id="collapseFour" class="collapse" aria-labelledby="headingFour" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        10% down payment of total cost, 50% of total cost upon contractor assignment and 40% upon the renovation work completion.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingFive" data-toggle="collapse" data-target="#collapseFive" aria-expanded="false" aria-controls="collapseFive">
                    <h2 class="hnm-accordion__title">What if the contractors charged me more than the cost that agreed earlier?</h2>
                </div>
                <div id="collapseFive" class="collapse" aria-labelledby="headingFive" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        You are strongly suggested to report the issue to Home And Me within the next working day.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingSix" data-toggle="collapse" data-target="#collapseSix" aria-expanded="false" aria-controls="collapseSix">
                    <h2 class="hnm-accordion__title">What shall I do if I like to do some minor changes and adjustment?</h2>
                </div>
                <div id="collapseSix" class="collapse" aria-labelledby="headingSix" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        You are strongly advised to add on your minor changes and adjustment through the Home And Me online platform and we will do the needed.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingSeven" data-toggle="collapse" data-target="#collapseSeven" aria-expanded="false" aria-controls="collapseSeven">
                    <h2 class="hnm-accordion__title">In the event of designs and item changes, and unforeseen condition that may result in extra cost. What shall I do?</h2>
                </div>
                <div id="collapseSeven" class="collapse" aria-labelledby="headingSeven" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        You are strongly advised to add on the changes through the online platform or inform the administrator about your concerns. 
                        Additional renovation work charges may occur if the changes are made by you, and not being informed or recorded on the online platform. 
                        Instance, a certain of renovation work that is not being notified will not be covered after 5 working days.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingEight" data-toggle="collapse" data-target="#collapseEight" aria-expanded="false" aria-controls="collapseEight">
                    <h2 class="hnm-accordion__title">What type of changes can be incorporated into the project without causing a delay to the renovation schedule?</h2>
                </div>
                <div id="collapseEight" class="collapse" aria-labelledby="headingEight" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        Please be reminded each changes may lead to the late of renovation completion. 
                        As such, one part or whole of the renovation work schedule may delay. 
                        You are advised to check with the subcontractor prior the decision has been made. 
                        Once both of your agreement is reach, Home And Me will update you the schedule again.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingNine" data-toggle="collapse" data-target="#collapseNine" aria-expanded="false" aria-controls="collapseNine">
                    <h2 class="hnm-accordion__title">Can I change my contractor?</h2>
                </div>
                <div id="collapseNine" class="collapse" aria-labelledby="headingNine" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        You have the rights to change the contractor prior to commencement of renovation work. 
                      Additional charges may occur if the contractor change request is in the midst of renovation work carried out.
                    </div>
                </div>
            </div>
            <div class="hnm-accordion__item">
                <div class="hnm-accordion__header" id="headingTen" data-toggle="collapse" data-target="#collapseTen" aria-expanded="false" aria-controls="collapseTen">
                    <h2 class="hnm-accordion__title">How can I ensure that the item that have been selected is my expectation?</h2>
                </div>
                <div id="collapseTen" class="collapse" aria-labelledby="headingTen" data-parent="#hnmAccordion">
                    <div class="hnm-accordion__content">
                        You will be offered to view the actual design and item sample before the commencement of renovation work.
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>

